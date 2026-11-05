import type { ModelStatic } from "sequelize";
import type { User } from "../models/user";
import type { UserRole } from "../types/user-role";

export interface CreateUserRecord {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

// Expone las operaciones del modelo necesarias para consultar y guardar usuarios.
export type UserRepositoryModel = ModelStatic<User>;

// Encapsula las búsquedas de usuarios para que los servicios no consulten Sequelize directamente.
export class UserRepository {
  constructor(private readonly userModel: UserRepositoryModel) {}

  // Busca un usuario por su clave primaria y devuelve null cuando no existe.
  findById(id: number): Promise<User | null> {
    return this.userModel.findByPk(id);
  }

  // Busca un usuario por su dirección de email y devuelve null si no hay coincidencia.
  findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ where: { email } });
  }

  // Guarda el nuevo usuario con el hash ya generado por la capa de servicio.
  create(user: CreateUserRecord): Promise<User> {
    return this.userModel.create(user);
  }

  // Devuelve todos los usuarios ordenados por ID para listarlos de forma estable.
  findAll(): Promise<User[]> {
    return this.userModel.findAll({ order: [["id", "ASC"]] });
  }

  // Cambia el rol del usuario y devuelve null cuando el ID no existe.
  async updateRole(id: number, role: UserRole): Promise<User | null> {
    const user = await this.findById(id);
    if (!user) return null;

    user.role = role;
    await user.save();
    return user;
  }
}
