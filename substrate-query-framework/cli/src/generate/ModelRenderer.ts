import { ObjectType, WarthogModel } from '../model';
import Debug from 'debug';
import { GeneratorContext } from './SourcesGenerator';
import { buildFieldContext, TYPE_FIELDS } from './field-context';
import * as utils from './utils';
import { GraphQLEnumType } from 'graphql';
import { withEnum } from './enum-context';
import { AbstractRenderer } from './AbstractRenderer';
import { EnumContextProvider } from './EnumContextProvider';

const debug = Debug('qnode-cli:model-renderer');

export class ModelRenderer extends AbstractRenderer {
  private objType: ObjectType;
  private enumCtxProvider: EnumContextProvider;

  constructor(
    model: WarthogModel,
    objType: ObjectType,
    enumContextProvider: EnumContextProvider,
    context: GeneratorContext = {}
  ) {
    super(model, context);
    this.objType = objType;
    this.enumCtxProvider = enumContextProvider;
  }

  withEnums(): GeneratorContext {
    // we need to have a state to render exports only once
    const referncedEnums = new Set<GraphQLEnumType>();
    this.objType.fields.map(f => {
      if (f.isEnum()) referncedEnums.add(this.model.lookupEnum(f.type));
    });
    const enums: GeneratorContext[] = [];
    for (const e of referncedEnums) {
      enums.push(this.enumCtxProvider.withEnum(e));
    }
    return {
      enums,
    };
  }

  withFields(): GeneratorContext {
    const fields: GeneratorContext[] = [];
    this.objType.fields.map(f => fields.push(buildFieldContext(f, this.objType)));
    return {
      fields,
    };
  }

  withHasProps(): GeneratorContext {
    const has: GeneratorContext = {};
    for (const key in TYPE_FIELDS) {
      const _key: string = key === 'numeric' ? 'numeric' || 'decimal' : key;
      has[key] = this.objType.fields.some(f => f.columnType() === _key);
    }
    has['array'] = this.objType.fields.some(f => f.isArray());
    has['enum'] = this.objType.fields.some(f => f.isEnum());
    debug(`ObjectType has: ${JSON.stringify(has, null, 2)}`);

    return {
      has,
    };
  }

  transform(): GeneratorContext {
    return {
      ...this.context, //this.getGeneratedFolderRelativePath(objType.name),
      ...this.withFields(),
      ...this.withEnums(),
      ...this.withHasProps(),
      ...utils.withNames(this.objType.name),
    };
  }
}
