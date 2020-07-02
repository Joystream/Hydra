import { WarthogModel, Field, ObjectType } from '../model';
import { generateJoinColumnName, generateJoinTableName } from './utils';
import { camelCase } from 'lodash';

export class RelationshipGenerator {
  visited: string[];
  model: WarthogModel;

  constructor(model: WarthogModel) {
    this.model = model;
    this.visited = [];
  }

  addMany2Many(field: Field, relatedField: Field, objType: ObjectType, relatedObject: ObjectType): void {
    field.relation = {
      type: 'mtm',
      columnType: field.type,
      joinTable: {
        tableName: generateJoinTableName(objType.name, relatedObject.name),
        joinColumn: generateJoinColumnName(objType.name),
        inverseJoinColumn: generateJoinColumnName(relatedObject.name),
      },
      relatedTsProp: relatedField.name,
    };
    relatedField.relation = {
      type: 'mtm',
      columnType: relatedField.type,
      relatedTsProp: field.name,
    };

    objType.relatedEntityImports.add(relatedObject.name);
    relatedObject.relatedEntityImports.add(objType.name);
    this.addToVisited(field, objType);
    this.addToVisited(relatedField, relatedObject);
  }

  addOne2Many(field: Field, relatedField: Field, objType: ObjectType, relatedObject: ObjectType): void {
    field.relation = {
      type: 'otm',
      columnType: field.type,
      relatedTsProp: relatedField.name,
    };
    relatedField.relation = {
      type: 'mto',
      columnType: relatedField.type,
      relatedTsProp: field.name,
    };

    objType.relatedEntityImports.add(field.type);
    relatedObject.relatedEntityImports.add(objType.name);
    this.addToVisited(field, objType);
    this.addToVisited(relatedField, relatedObject);
  }

  addMany2One(field: Field, currentObject: ObjectType, relatedObject: ObjectType, relatedField: Field): void {
    field.relation = { type: 'mto', columnType: field.type };
    currentObject.relatedEntityImports.add(relatedObject.name);

    if (!relatedField) {
      // A virtual additinal field for field resolver
      const fname = camelCase(currentObject.name).concat('s');
      const additionalField = new Field(fname, relatedObject.name, field.nullable, false, true);
      additionalField.relation = { type: 'otm', columnType: currentObject.name, relatedTsProp: field.name };
      relatedObject.fields.push(additionalField);

      field.relation.relatedTsProp = additionalField.name;
      this.addToVisited(additionalField, relatedObject);
    } else {
      relatedField.relation = { type: 'otm', columnType: currentObject.name, relatedTsProp: field.name };
      field.relation.relatedTsProp = relatedField.name;
      this.addToVisited(relatedField, relatedObject);
    }

    currentObject.relatedEntityImports.add(relatedObject.name);
    relatedObject.relatedEntityImports.add(currentObject.name);

    this.addToVisited(field, currentObject);
  }

  addOne2One(field: Field, relatedField: Field, objType: ObjectType, relatedObject: ObjectType): void {
    field.relation = {
      type: 'oto',
      columnType: field.type,
      joinColumn: true,
      relatedTsProp: relatedField.name,
    };
    relatedField.relation = {
      type: 'oto',
      columnType: relatedField.type,
      relatedTsProp: field.name,
    };

    objType.relatedEntityImports.add(relatedObject.name);
    relatedObject.relatedEntityImports.add(objType.name);
    this.addToVisited(field, objType);
    this.addToVisited(relatedField, relatedObject);
  }

  addToVisited(f: Field, o: ObjectType): void {
    this.visited.push(o.name.concat(f.name));
  }

  isVisited(f: Field, o: ObjectType): boolean {
    return this.visited.includes(o.name.concat(f.name));
  }

  generate(): void {
    this.model.types.forEach(currentObject => {
      currentObject.fields.forEach(field => {
        if (this.isVisited(field, currentObject)) return;

        // ============= Case 1 =============
        if (!field.isBuildinType && field.derivedFrom) {
          const relatedObject = this.model.lookupType(field.type);
          const relatedField = this.model.lookupField(field.type, field.derivedFrom.argument);

          if (relatedField.derivedFrom) {
            throw new Error(
              `${relatedObject.name}->${relatedField.name} derived field can not reference to another derived field!`
            );
          }

          if (field.isList && relatedField.isList) {
            return this.addMany2Many(field, relatedField, currentObject, relatedObject);
          } else if (field.isList && !relatedField.isList) {
            return this.addOne2Many(field, relatedField, currentObject, relatedObject);
          }
          return this.addOne2One(field, relatedField, currentObject, relatedObject);
        }

        if (!field.isBuildinType && !field.isList && !field.derivedFrom) {
          const relatedObject = this.model.lookupType(field.type);
          const relatedFields = relatedObject.fields.filter(f => f.type === currentObject.name);

          if (relatedFields.length === 0) {
            return this.addMany2One(field, currentObject, relatedObject, {} as Field);
          } else {
            const derivedFields = relatedFields.filter(f => f.derivedFrom?.argument === field.name);
            if (derivedFields.length === 0) {
              throw new Error(
                `Incorrect one to one relationship. '${relatedObject.name}' should have a derived field 
                with @derivedFrom(field: "${field.name}") directive`
              );
            } else if (derivedFields.length === 1) {
              if (!derivedFields[0].isList) {
                return this.addOne2One(field, derivedFields[0], currentObject, relatedObject);
              } else {
                return this.addMany2One(field, currentObject, relatedObject, derivedFields[0]);
              }
            } else {
              throw new Error(
                `Found multiple derived fields with same argument -> @derivedField(field:"${field.name}")`
              );
            }
          }
        }

        // ============= Case 3 =============
        if (!field.isBuildinType && field.isList) {
          const relatedObject = this.model.lookupType(field.type);
          const relatedFields = relatedObject.fields.filter(f => f.type === currentObject.name && f.isList);

          if (relatedFields.length !== 1) {
            throw new Error(`Incorrect ManyToMany relationship detected! ${currentObject.name} -> ${field.name}
            found ${relatedFields.length} fields on ${relatedObject.name} of list type`);
          }
          if (!relatedFields[0].derivedFrom) {
            throw new Error(`Incorrect ManyToMany relationship detected! @derived directive
            for ${relatedObject.name}->${relatedFields[0].name} could not found`);
          }
          return this.addMany2Many(field, relatedFields[0], currentObject, relatedObject);
        }
      });
    });
  }
}
