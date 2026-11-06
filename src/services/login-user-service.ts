import bcrypt from "bcrypt";
import { HttpError } from "../errors/http-error";
import type { UserRepository } from "../repositories/user-repository";
import type { AppConfig } from "../config/env";
import { signAccessToken, type AccessTokenClaims } from "../utils/jwt";
import { validateLoginUserInput } from "../validation/login-user";

type LoginRepository = Pick<UserRepository, "findByEmail">;
type JwtSettings = Pick<AppConfig, "jwtSecret" | "jwtExpiresIn">;
type PasswordComparer = (password: string, passwordHash: string) => Promise<boolean>;
type AccessTokenSigner = (claims: AccessTokenClaims, settings: JwtSettings) => string;

export interface LoginResult {
  token: string;
}

// Compara credenciales y crea un JWT únicamente cuando coinciden con un usuario existente.
export class LoginUserService {
  constructor(
    private readonly userRepository: LoginRepository,
    private readonly jwtSettings: JwtSettings,
    private readonly comparePassword: PasswordComparer = bcrypt.compare,
    private readonly signToken: AccessTokenSigner = signAccessToken,
  ) {}

  // Devuelve el mismo error para emails desconocidos y contraseñas incorrectas.
  async execute(input: unknown): Promise<LoginResult> {
    const credentials = validateLoginUserInput(input);
    const user = await this.userRepository.findByEmail(credentials.email);

    if (!user) {
      throw invalidCredentialsError();
    }

    // Compara asíncronamente la contraseña recibida con el hash guardado.
    const passwordMatches = await this.comparePassword(credentials.password, user.passwordHash);
    if (!passwordMatches) {
      throw invalidCredentialsError();
    }

    // Firma el ID y el rol persistido del usuario, sin incluir la contraseña en el token.
    const token = this.signToken({ userId: user.id, role: user.role }, this.jwtSettings);

    return { token };
  }
}

// Evita revelar si el email está registrado.
function invalidCredentialsError(): HttpError {
  return new HttpError(401, "CREDENCIALES_INVALIDAS", "El email o la contraseña son incorrectos.");
}
