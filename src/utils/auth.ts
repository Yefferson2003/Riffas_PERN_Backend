import bcrypt from 'bcrypt';

export const hashPassword = async (password: string) => {
    return await bcrypt.hash(password, 10);
}

export const checkPassword = async (enteredPassword:string, storedHash: string) => {
    return await bcrypt.compare(enteredPassword, storedHash)
}