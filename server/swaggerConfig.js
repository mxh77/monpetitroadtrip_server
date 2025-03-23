import swaggerJsdoc from "swagger-jsdoc";
import yaml from "js-yaml";
import fs from "fs";

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "API Roadtrips",
            version: "1.0.0",
            description: "Documentation de l'API pour la gestion des roadtrips",
        },
        servers: [
            {
                url: "http://localhost:3000",
                description: "Serveur local",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT", // Indique qu'on utilise un token JWT
                },
            },
            schemas: {
                Roadtrip: {
                    type: "object",
                    properties: {
                        id: { type: "string", example: "12345" },
                        name: { type: "string", example: "Mon Roadtrip" },
                    },
                },
                RoadtripResponse: {
                    type: "object",
                    properties: {
                        _id: { type: "string" },
                        userId: { type: "string" },
                        name: { type: "string" },
                        startLocation: { type: "string" },
                        startDateTime: { type: "string", format: "date-time" },
                        endLocation: { type: "string" },
                        endDateTime: { type: "string", format: "date-time" },
                        currency: { type: "string" },
                        notes: { type: "string" },
                        photos: {
                            type: "array",
                            items: { $ref: "#/components/schemas/File" }
                        },
                        documents: {
                            type: "array",
                            items: { $ref: "#/components/schemas/File" }
                        },
                        thumbnail: { $ref: "#/components/schemas/File" },
                        steps: {
                            type: "array",
                            items: { $ref: "#/components/schemas/Step" }
                        },
                        __v: { type: "integer" }
                    }
                },
                Step: {
                    type: "object",
                    properties: {
                        _id: { type: "string" },
                        userId: { type: "string" },
                        roadtripId: { type: "string" },
                        type: { type: "string" },
                        name: { type: "string" },
                        address: { type: "string" },
                        latitude: { type: "number" },
                        longitude: { type: "number" },
                        arrivalDateTime: { type: "string", format: "date-time" },
                        departureDateTime: { type: "string", format: "date-time" },
                        travelTime: { type: "number" },
                        isArrivalTimeConsistent: { type: "boolean" },
                        notes: { type: "string" },
                        photos: {
                            type: "array",
                            items: { $ref: "#/components/schemas/File" }
                        },
                        documents: {
                            type: "array",
                            items: { $ref: "#/components/schemas/File" }
                        },
                        thumbnail: { $ref: "#/components/schemas/File" },
                        accommodations: {
                            type: "array",
                            items: { $ref: "#/components/schemas/Accommodation" }
                        },
                        activities: {
                            type: "array",
                            items: { $ref: "#/components/schemas/Activity" }
                        },
                        __v: { type: "integer" }
                    }
                },
                Accommodation: {
                    type: "object",
                    properties: {
                        _id: { type: "string" },
                        userId: { type: "string" },
                        stepId: { type: "string" },
                        name: { type: "string" },
                        address: { type: "string" },
                        latitude: { type: "number" },
                        longitude: { type: "number" },
                        website: { type: "string" },
                        phone: { type: "string" },
                        email: { type: "string" },
                        reservationNumber: { type: "string" },
                        confirmationDateTime: { type: "string", format: "date-time" },
                        arrivalDateTime: { type: "string", format: "date-time" },
                        departureDateTime: { type: "string", format: "date-time" },
                        nights: { type: "integer" },
                        price: { type: "number" },
                        notes: { type: "string" },
                        photos: {
                            type: "array",
                            items: { $ref: "#/components/schemas/File" }
                        },
                        documents: {
                            type: "array",
                            items: { $ref: "#/components/schemas/File" }
                        },
                        thumbnail: { $ref: "#/components/schemas/File" },
                        __v: { type: "integer" }
                    }
                },
                Activity: {
                    type: "object",
                    properties: {
                        _id: { type: "string" },
                        userId: { type: "string" },
                        stepId: { type: "string" },
                        name: { type: "string" },
                        address: { type: "string" },
                        latitude: { type: "number" },
                        longitude: { type: "number" },
                        website: { type: "string" },
                        phone: { type: "string" },
                        email: { type: "string" },
                        startDateTime: { type: "string", format: "date-time" },
                        endDateTime: { type: "string", format: "date-time" },
                        duration: { type: "number" },
                        typeDuration: { type: "string" },
                        reservationNumber: { type: "string" },
                        price: { type: "number" },
                        notes: { type: "string" },
                        photos: {
                            type: "array",
                            items: { $ref: "#/components/schemas/File" }
                        },
                        documents: {
                            type: "array",
                            items: { $ref: "#/components/schemas/File" }
                        },
                        thumbnail: { $ref: "#/components/schemas/File" },
                        __v: { type: "integer" }
                    }
                },
                File: {
                    type: "object",
                    properties: {
                        _id: { type: "string" },
                        url: { type: "string" },
                        type: { type: "string" },
                        fileId: { type: "string" },
                        createdAt: { type: "string", format: "date-time" },
                        __v: { type: "integer" }
                    }
                }
            }
        },
    },
    apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

// Exporter l'OpenAPI en fichier JSON/YAML
fs.writeFileSync("./openapi.json", JSON.stringify(swaggerSpec, null, 2));
console.log("✅ OpenAPI généré dans openapi.json");

fs.writeFileSync("./openapi.yaml", yaml.dump(swaggerSpec));
console.log("✅ OpenAPI YAML généré dans openapi.yaml");

export default swaggerSpec;