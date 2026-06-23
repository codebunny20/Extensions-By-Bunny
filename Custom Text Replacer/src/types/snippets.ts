export type SnippetMap = Record<string, string>;

export interface SnippetMessage {
  type: "GET_SNIPPETS" | "SET_SNIPPETS" | "EXPORT_SNIPPETS";
  payload?: SnippetMap;
}
