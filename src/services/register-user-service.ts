import bcrypt from "bcrypt";
import { UniqueConstraintError } from "sequelize";
import { HttpError } from "../errors/http-error";
import type { User } from "../models/user";
import type { UserRepository } from "../repositories/user-repository";
import { DEFAULT_USER_ROLE, type UserRole } from "../types/user-role";
import { validateRegisterUserInput } from "../validation/register-user";

const BCRYPT_SALT_ROUNDS = 10;

export interface RegisteredUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

type RegistrationRepository = Pick<UserRepository, "findByEmail" | "create">;
type PasswordHasher = (password: string, saltRounds: number) => Promise<string>;

// Coordina validación, búsqueda de duplicados, hash de contraseña y guardado del usuario.
export class RegisterUserService {
  constructor(
    private readonly userRepository: RegistrationRepository,
    private readonly hashPassword: PasswordHasher = bcrypt.hash,
  ) {}

  // Registra un desarrollador y devuelve sus datos públicos, nunca el hash de contraseña.
  async execute(input: unknown): Promise<RegisteredUser> {
    const registration = validateRegisterUserInput(input);

    // Evita calcular un hash costoso cuando el email ya está registrado.
    if (await this.userRepository.findByEmail(registration.email)) {
      throw duplicateEmailError();
    }

    // Calcula el hash asíncronamente antes de enviar los datos al repositorio.
    const passwordHash = await this.hashPassword(registration.password, BCRYPT_SALT_ROUNDS);

    let user: User;
    try {
      user = await this.userRepository.create({
        name: registration.name,
        email: registration.email,
        passwordHash,
        role: DEFAULT_USER_ROLE,
      });
    } catch (error) {
      // La restricción UNIQUE también cubre dos registros simultáneos con el mismo email.
      if (error instanceof UniqueConstraintError) {
        throw duplicateEmailError();
      }

      throw error;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

// Usa el mismo error HTTP para duplicados detectados antes o durante el guardado.
function duplicateEmailError(): HttpError {
  return new HttpError(400, "EMAIL_DUPLICADO", "Ya existe una cuenta registrada con ese email.");
}
