import {
  parse,
  buildASTSchema,
  GraphQLSchema,
  validateSchema,
  ObjectTypeDefinitionNode,
  FieldDefinitionNode
} from 'graphql';
import * as fs from 'fs-extra';

// this preamble is added to the schema 
// in order to pass the SDL validation
const SCHEMA_DEFINITIONS_PREAMBLE = `
type Query {
    _dummy: String # empty queries are not allowed
}
directive @fullTextSearchable(query: String) on FIELD_DEFINITION
`

/**
 * Parse GraphQL schema
 * @constructor(schemaPath: string)
 */
export class GraphQLSchemaParser {
  // GraphQL shchema
  schema: GraphQLSchema;
  // List of the object types defined in schema
  private _objectTypeDefinations: ObjectTypeDefinitionNode[];

  constructor(schemaPath: string) {
    if (!fs.existsSync(schemaPath)) {
        throw new Error('Schema not found');
    }
    const contents = fs.readFileSync(schemaPath, 'utf8');
    this.schema = GraphQLSchemaParser.buildSchema(contents);
    this._objectTypeDefinations = GraphQLSchemaParser.createObjectTypeDefinations(this.schema);
  }

  /**
   * Read GrapqhQL schema and build a schema from it
   */
  static buildSchema(contents: string): GraphQLSchema {
    const schema = SCHEMA_DEFINITIONS_PREAMBLE.concat(contents);
    const ast = parse(schema);
    // in order to build AST with undeclared directive, we need to 
    // switch off SDL validation
    const schemaAST = buildASTSchema(ast);

    const errors = validateSchema(schemaAST);

    if (errors.length > 0) {
      // There are errors
      let errorMsg = `Schema is not valid. Please fix the following errors: \n`;
      errors.forEach(e => errorMsg += `\t ${e.name}: ${e.message}\n`);
      throw new Error(errorMsg);
    }

    return schemaAST;
  }

  /**
   * Get object type definations from the schema. Build-in and scalar types are excluded.
   */
  static createObjectTypeDefinations(schema: GraphQLSchema): ObjectTypeDefinitionNode[] {
    return [
      ...Object.values(schema.getTypeMap())
        // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
        .filter(t => !t.name.match(/^__/) && !t.name.match(/Query/)) // skip the top-level Query type
        .sort((a, b) => (a.name > b.name ? 1 : -1))
        .map(t => t.astNode)
    ]
      .filter(Boolean) // Remove undefineds and nulls
      .filter(typeDefinationNode => typeDefinationNode?.kind === 'ObjectTypeDefinition') as ObjectTypeDefinitionNode[];
  }

  /**
   * Returns fields for a given GraphQL object
   * @param objDefinationNode ObjectTypeDefinitionNode
   */
  getFields(objDefinationNode: ObjectTypeDefinitionNode): FieldDefinitionNode[] {
    if (objDefinationNode.fields) return [...objDefinationNode.fields];
    return [];
  }

  /**
   * Returns GraphQL object names
   */
  getTypeNames(): string[] {
    return this._objectTypeDefinations.map(o => o.name.value);
  }

  /**
   * Returns GraphQL object type definations
   */
  getObjectDefinations(): ObjectTypeDefinitionNode[] {
    return this._objectTypeDefinations;
  }
}
