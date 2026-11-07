"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCategory, deleteCategory, updateCategory } from "@/app/actions/categories";

export type CategoryRow = {
  id: string;
  name: string;
  description: string | null;
  productCount: number;
};

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function resetForm() {
    setEditingId(null);
    setName("");
    setDescription("");
  }

  function startEdit(category: CategoryRow) {
    setEditingId(category.id);
    setName(category.name);
    setDescription(category.description ?? "");
    setConfirmId(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const result = editingId
        ? await updateCategory({ id: editingId, name, description })
        : await createCategory({ name, description });
      if (result.ok) {
        toast.success(editingId ? "Category updated." : "Category added.");
        resetForm();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(category: CategoryRow) {
    if (confirmId !== category.id) {
      setConfirmId(category.id);
      return;
    }
    setPending(true);
    try {
      const result = await deleteCategory(category.id);
      if (result.ok) {
        toast.success("Category deleted.");
        setConfirmId(null);
        if (editingId === category.id) resetForm();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          resetForm();
          setConfirmId(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <FolderPlus className="h-4 w-4" />
          Categories
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Product categories</DialogTitle>
          <DialogDescription>
            Organise ink, toner and cartridges into categories. Categories with products cannot be
            deleted.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-slate-50/70 p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr]">
            <div className="space-y-1.5">
              <Label htmlFor="category-name">Category name</Label>
              <Input
                id="category-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Toner cartridges"
                disabled={pending}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category-description">Description (optional)</Label>
              <Input
                id="category-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Short description"
                disabled={pending}
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            {editingId ? (
              <Button type="button" variant="ghost" size="sm" onClick={resetForm} disabled={pending}>
                Cancel edit
              </Button>
            ) : null}
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingId ? "Save category" : "Add category"}
            </Button>
          </div>
        </form>

        <div className="max-h-72 space-y-2 overflow-y-auto scrollbar-thin">
          {categories.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No categories yet.</p>
          ) : (
            categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-white px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{category.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {category.description || "No description"} ·{" "}
                    {category.productCount} product{category.productCount === 1 ? "" : "s"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => startEdit(category)}
                  disabled={pending}
                  aria-label={`Rename ${category.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant={confirmId === category.id ? "destructive" : "ghost"}
                  size="sm"
                  className={confirmId === category.id ? "" : "h-9 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"}
                  onClick={() => handleDelete(category)}
                  disabled={pending}
                  aria-label={
                    confirmId === category.id
                      ? `Confirm delete ${category.name}`
                      : `Delete ${category.name}`
                  }
                >
                  <Trash2 className="h-4 w-4" />
                  {confirmId === category.id ? "Confirm" : null}
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
