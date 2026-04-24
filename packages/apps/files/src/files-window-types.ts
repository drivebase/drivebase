import type { ListChildrenQuery, MyProvidersQuery } from "@drivebase/data/gql"
import type { FileItemNode } from "./components/file-item"

export type Provider = MyProvidersQuery["myProviders"][number]
export type Node = ListChildrenQuery["listChildren"]["nodes"][number]
export type DraftFolderNode = FileItemNode & { draft: true; creating?: boolean }
