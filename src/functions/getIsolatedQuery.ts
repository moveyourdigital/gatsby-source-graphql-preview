import { DocumentNode } from "@apollo/client"
import gql from "graphql-tag"
import traverse from "traverse"

function doesQueryUseFragment(query: DocumentNode, fragment: string) {
  let queryUsesFragment = false;

  traverse(query).forEach(function(currentValue) {
    // We're looking for this kind of construct
    // {
    //   "kind": "FragmentSpread", // 1
    //   "name": {                 // 2
    //     "kind": "Name",
    //     "value": "<fragment>"   // 3, currentValue
    //   }
    // }
    if (
      this.isLeaf &&
      this.key === 'value' && // 3
      this.parent &&
      this.parent.key === 'name' && // 2
      this.parent.parent &&
      this.parent.parent.node.kind === 'FragmentSpread' // 1
    ) {
      if (currentValue === fragment) {
        queryUsesFragment = true;
      }
    }
  });

  return queryUsesFragment;
};

export default function getIsolatedQuery(
  querySource: string,
  fieldName: string,
  typeName: string,
) {
  const updatedQuery = traverse(gql(querySource)).clone();

  // @ts-ignore
  const updatedRoot = updatedQuery.definitions[0].selectionSet.selections.find(
    (selection: {
      name: { kind: string, value: string }
    }) =>
      selection.name &&
      selection.name.kind === 'Name' &&
      selection.name.value === fieldName,
  );

  if (updatedRoot) {
    // @ts-ignore
    updatedQuery.definitions[0].selectionSet.selections =
      updatedRoot.selectionSet.selections;
  } else if (fieldName) {
    console.warn('Failed to update query root');
    return;
  }

  traverse(updatedQuery).forEach(function(currentValue) {
    if (this.isLeaf && this.parent && this.parent.key === 'name') {
      if (this.parent.parent && this.parent.parent.node.kind === 'NamedType') {
        if (
          typeof currentValue === 'string' &&
          currentValue.indexOf(`${typeName}_`) === 0
        ) {
          this.update(currentValue.substr(typeName.length + 1));
        }
      }
    }
  });

  let index = 0;
  do {
    const definition = updatedQuery.definitions[index];

    if (definition.kind === 'FragmentDefinition') {
      if (!doesQueryUseFragment(updatedQuery, definition.name.value)) {
        // delete fragment and start again, since other fragments possibly only
        // depended on the deleted one.
        // @ts-ignore
        updatedQuery.definitions.splice(index, 1);
        index = 0;
        continue;
      }
    }

    index += 1;
  } while (index < updatedQuery.definitions.length);

  return updatedQuery;
};
