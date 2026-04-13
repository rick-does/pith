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
