import { HttpError } from "../errors/http-error";
import type { UserRepository } from "../repositories/user-repository";
import { isUserRole, type UserRole } from "../types/user-role";

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

// Quita campos privados antes de devolver los datos del modelo a la API.
function toPublicUser(user: { id: number; name: string; email: string; role: UserRole }): PublicUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

// Lista usuarios sin incluir hashes ni otros datos internos.
export class ListUsersService {
  constructor(private readonly userRepository: Pick<UserRepository, "findAll">) {}

  async execute(): Promise<PublicUser[]> {
    return (await this.userRepository.findAll()).map(toPublicUser);
  }
}

// Valida el ID y el rol antes de persistir un cambio de permisos.
export class ChangeUserRoleService {
  constructor(private readonly userRepository: Pick<UserRepository, "updateRole">) {}

  async execute(idValue: unknown, roleValue: unknown): Promise<PublicUser> {
    const id = typeof idValue === "string" && /^\d+$/.test(idValue) ? Number(idValue) : NaN;
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new HttpError(400, "ID_INVALIDO", "El ID debe ser un número entero positivo.");
    }
    if (!isUserRole(roleValue)) {
      throw new HttpError(400, "ROL_INVALIDO", "El rol debe ser admin o developer.");
    }
    const user = await this.userRepository.updateRole(id, roleValue);
    if (!user) throw new HttpError(404, "USUARIO_NO_ENCONTRADO", "No se encontró el usuario solicitado.");
    return toPublicUser(user);
  }
}
