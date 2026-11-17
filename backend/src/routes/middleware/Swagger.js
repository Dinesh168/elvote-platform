const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');

class Swagger {

    static setup(app) {
        const options = {
            failOnErrors: true,
            definition: {
              openapi: '3.0.0',
              info: {
                title: "My API",
                description: "Description",
                version: '1.0.0',
              },
              security: [
                {
                  BearerAuth: [],
                  IdTokenAuth: []
                }
              ]
            },
            apis: [`${__dirname}/schemaConstants.js`],
        };
        const openapiSpecification = swaggerJsDoc(options);
        
        app.use('/swagger-docs', swaggerUi.serve, swaggerUi.setup(openapiSpecification));
    }


}

module.exports = Swagger;
