"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var graphql_tag_1 = __importDefault(require("graphql-tag"));
var traverse_1 = __importDefault(require("traverse"));
function doesQueryUseFragment(query, fragment) {
    var queryUsesFragment = false;
    traverse_1.default(query).forEach(function (currentValue) {
        // We're looking for this kind of construct
        // {
        //   "kind": "FragmentSpread", // 1
        //   "name": {                 // 2
        //     "kind": "Name",
        //     "value": "<fragment>"   // 3, currentValue
        //   }
        // }
        if (this.isLeaf &&
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
}
;
function getIsolatedQuery(querySource, fieldName, typeName) {
    var updatedQuery = traverse_1.default(graphql_tag_1.default(querySource)).clone();
    // @ts-ignore
    var updatedRoot = updatedQuery.definitions[0].selectionSet.selections.find(function (selection) {
        return selection.name &&
            selection.name.kind === 'Name' &&
            selection.name.value === fieldName;
    });
    if (updatedRoot) {
        // @ts-ignore
        updatedQuery.definitions[0].selectionSet.selections =
            updatedRoot.selectionSet.selections;
    }
    else if (fieldName) {
        console.warn('Failed to update query root');
        return;
    }
    traverse_1.default(updatedQuery).forEach(function (currentValue) {
        if (this.isLeaf && this.parent && this.parent.key === 'name') {
            if (this.parent.parent && this.parent.parent.node.kind === 'NamedType') {
                if (typeof currentValue === 'string' &&
                    currentValue.indexOf(typeName + "_") === 0) {
                    this.update(currentValue.substr(typeName.length + 1));
                }
            }
        }
    });
    var index = 0;
    do {
        var definition = updatedQuery.definitions[index];
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
}
exports.default = getIsolatedQuery;
;
