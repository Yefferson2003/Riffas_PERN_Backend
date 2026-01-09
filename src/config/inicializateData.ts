
import Rol, { rolEnum } from '../models/rol';
import User from '../models/user';
import { hashPassword } from '../utils/auth';

export async function inicializateData() {
	// Crear roles si no existen
	for (const name of rolEnum) {
		await Rol.findOrCreate({ where: { name } });
	}

	// Datos de usuarios iniciales
	const users = [
		{
			firstName: 'Admin',
			lastName: 'Principal',
			identificationType: 'CC',
			identificationNumber: '1000000000',
			phone: '3000000000',
			address: 'Calle Admin',
			email: 'admin@demo.com',
			password: 'admin123',
			rol: 'admin',
		},
		{
			firstName: 'Responsable',
			lastName: 'Demo',
			identificationType: 'CC',
			identificationNumber: '2000000000',
			phone: '3000000001',
			address: 'Calle Responsable',
			email: 'responsable@demo.com',
			password: 'responsable123',
			rol: 'responsable',
		},
		{
			firstName: 'Vendedor',
			lastName: 'Demo',
			identificationType: 'CC',
			identificationNumber: '3000000000',
			phone: '3000000002',
			address: 'Calle Vendedor',
			email: 'vendedor@demo.com',
			password: 'vendedor123',
			rol: 'vendedor',
		},
	];

	for (const userData of users) {
		const rol = await Rol.findOne({ where: { name: userData.rol } });
		if (!rol) continue;
		const [user, created] = await User.findOrCreate({
			where: { email: userData.email },
			defaults: {
				...userData,
				password: await hashPassword(userData.password),
				rolId: rol.id,
			},
		});
		// Si el usuario existe pero el rol cambió, actualizarlo
		if (!created && user.rolId !== rol.id) {
			user.rolId = rol.id;
			await user.save();
		}
	}
}
