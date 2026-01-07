
// Mapeo de opciones de orden para clientes
// 1: Alfabético ASC, 2: Alfabético DESC, 3: Fecha creación DESC, 4: Fecha creación ASC
export const clientOrderMap = {
	1: [['lastName', 'ASC'], ['firstName', 'ASC']],
	2: [['lastName', 'DESC'], ['firstName', 'DESC']],
	3: [['createdAt', 'DESC']],
	4: [['createdAt', 'ASC']]
};
