import type { ModelStatic } from "sequelize";
import type { User } from "../models/user";

// Expone únicamente las consultas del modelo que necesita este repositorio.
export type UserLookupModel = ModelStatic<User>;

// Encapsula las búsquedas de usuarios para que los servicios no consulten Sequelize directamente.
export class UserRepository {
  constructor(private readonly userModel: UserLookupModel) {}

  // Busca un usuario por su clave primaria y devuelve null cuando no existe.
  findById(id: number): Promise<User | null> {
    return this.userModel.findByPk(id);
  }

  // Busca un usuario por su dirección de email y devuelve null si no hay coincidencia.
  findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ where: { email } });
  }
}
