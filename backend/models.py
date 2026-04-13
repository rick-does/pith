from __future__ import annotations
from pydantic import BaseModel


class FileNode(BaseModel):
    path: str
    title: str
    order: int = 0
    children: list[FileNode] = []


class CollectionStructure(BaseModel):
    root: list[FileNode] = []


class FileContent(BaseModel):
    path: str
    content: str
    title: str | None = None


class ReorderRequest(BaseModel):
    collection: CollectionStructure


class DocusaurusImportRequest(BaseModel):
    filename: str | None = None


class FrontmatterField(BaseModel):
    key: str
    type: str = "string"  # string, list, enum, boolean, date
    default: str | list | bool | None = None
    options: list[str] | None = None  # for enum type


class FrontmatterTemplate(BaseModel):
    fields: list[FrontmatterField] = []
