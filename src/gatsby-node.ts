import { GatsbyNode, PluginOptions } from "gatsby"
import getFragmentTypes from "./functions/getFragmentTypes"
import getIsolatedQuery from "./functions/getIsolatedQuery"

interface ThisPluginOptions extends PluginOptions {
  fieldName: string
  typeName: string
  url: string
  headers: RequestInit["headers"]
  credentials: RequestInit["credentials"]
}

export const onCreateWebpackConfig: GatsbyNode["onCreateWebpackConfig"] = async (
  { store, actions, plugins },
  options: ThisPluginOptions,
) => {
  const queries = Array.from(store.getState().components, ([, {query}]) => query)
  const isolatedQueries = {}

  for (let rawQuery of queries) {
    if (!rawQuery) continue
    const query = getIsolatedQuery(rawQuery, options.fieldName, options.typeName)
    // @ts-ignore
    if (query) isolatedQueries[query.definitions[0].name.value] = query
  }

  const fragmentTypes = await getFragmentTypes(options);

  actions.setWebpackConfig({
    plugins: [
      plugins.define({
        GATSBY_SOURCE_GRAPHQL_PREVIEW_ISOLATED_QUERIES: JSON.stringify(
          isolatedQueries,
        ),
        GATSBY_SOURCE_GRAPHQL_PREVIEW_FRAGMENT_TYPES: JSON.stringify(
          fragmentTypes,
        ),
      }),
    ],
  });
}
