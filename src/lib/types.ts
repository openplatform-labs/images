export type LogoCollection = "simple" | "themed";

export type SimpleVariant = "default" | "icon";

export type ThemedVariant =
  | "default"
  | "mono"
  | "light"
  | "dark"
  | "color"
  | "wordmark"
  | "wordmarkLight"
  | "wordmarkDark"
  | "icon"
  | "size16"
  | "size32"
  | "size64"
  | "line";

export type LogoVariant = SimpleVariant | ThemedVariant;

export interface LogoFile {
  filename: string;
  staticallyUrl: string;
  role: LogoVariant;
  format: "svg";
  scalable: true;
}

export interface LogoEntry {
  shortname: string;
  name: string;
  url: string | null;
  collection: LogoCollection;
  source: string | null;
  files: LogoFile[];
  categories: Category[];
  tags: Tag[];
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  logoCount?: number;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
  logoCount?: number;
}

export interface LogosJsonFileEntry {
  filename: string;
  variant: LogoVariant;
}

export interface LogosJsonEntry {
  name: string;
  shortname: string;
  url: string;
  collection?: LogoCollection;
  source?: string;
  files: LogosJsonFileEntry[] | string[];
}

export interface LogoListResult {
  items: LogoEntry[];
  total: number;
  page: number;
  pageSize: number;
}
