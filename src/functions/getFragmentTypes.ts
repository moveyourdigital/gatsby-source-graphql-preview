import fetch from "node-fetch"

export default async function getFragmentTypes({
  url,
  headers,
  credentials,
}: {
  url: string
  headers: RequestInit["headers"]
  credentials: RequestInit["credentials"]
}) {
  const response = await fetch(url, {
    method: 'POST',
    // @ts-ignore
    headers: { 'Content-Type': 'application/json', ...headers },
    credentials,
    body: JSON.stringify({
      variables: {},
      query: `
      {
        __schema {
          types {
            kind
            name
            possibleTypes {
              name
            }
          }
        }
      }
    `,
    }),
  });
  const result = await response.json();

  // here we're filtering out any type information unrelated to unions or interfaces
  const filteredData = result.data.__schema.types.filter(
    (type: any) => type.possibleTypes !== null,
  );
  result.data.__schema.types = filteredData;

  return result.data;
}
