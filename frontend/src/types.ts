export interface FileNode {
  path: string;
  title: string;
  order: number;
  children?: FileNode[];
}

export interface CollectionStructure {
  root: FileNode[];
}

export interface FileInfo {
  path: string;
  title: string;
}

export interface ProjectInfo {
  name: string;
  title: string;
  archived?: boolean;
  markdowns_dir?: string;
}

export type OverlayType = "editor" | "yaml" | "project-md" | null;

export interface EditorTab {
  id: string;
  type: "editor";
  path: string;
  content: string;
  savedContent: string;
  title: string;
  frontmatter: Record<string, any>;
  brokenLinks: import("./api").BrokenLink[];
  colorIndex: number;
}
