import server from './server';

const port = process.env.PORT || 4100;

server.listen(port, () => {
    console.log(`REST API funcionando desde el puerto: ${port}`);
});