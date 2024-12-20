import { OpenAPITool } from "@/tools/openapi.js";
import { verifyDeserialization } from "@tests/e2e/utils.js";
const cat_spec =
  '{\
    "openapi": "3.0.0",\
    "info": {\
      "title": "Cat Facts API",\
      "description": "A simple API for cat facts",\
      "version": "1.0.0"\
    },\
    "servers": [\
      {\
        "url": "https://catfact.ninja",\
        "description": "Production server"\
      }\
    ],\
    "paths": {\
      "/fact": {\
        "get": {\
          "summary": "Get a random cat fact",\
          "description": "Returns a random cat fact.",\
          "responses": {\
            "200": {\
              "description": "Successful response",\
              "content": {\
                "application/json": {\
                  "schema": {\
                    "$ref": "#/components/schemas/Fact"\
                  }\
                }\
              }\
            }\
          }\
        }\
      }\
    },\
    "components": {\
      "schemas": {\
        "Fact": {\
          "type": "object",\
          "properties": {\
            "fact": {\
              "type": "string",\
              "description": "The cat fact"\
            }\
          }\
        }\
      }\
    }\
  }';

describe("Base Tool", () => {
  beforeEach(() => {
    vi.clearAllTimers();
  });

  describe("OpenAPITool", () => {
    it("Serializes", () => {
      const tool = new OpenAPITool({ name: "OpenAPITool", openApiSchema: cat_spec });

      const serialized = tool.serialize();
      const deserialized = OpenAPITool.fromSerialized(serialized);
      verifyDeserialization(tool, deserialized);
    });
  });
});
