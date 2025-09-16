import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { Todo, CreateTodoInput, UpdateTodoInput } from '../../server/src/schema';

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

  // Form state for creating new todos
  const [formData, setFormData] = useState<CreateTodoInput>({
    title: '',
    description: null
  });

  // Form state for editing todos
  const [editFormData, setEditFormData] = useState<UpdateTodoInput>({
    id: 0,
    title: '',
    description: null,
    completed: false
  });

  const loadTodos = useCallback(async () => {
    try {
      const result = await trpc.getTodos.query();
      setTodos(result);
    } catch (error) {
      console.error('Failed to load todos:', error);
    }
  }, []);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setIsLoading(true);
    try {
      const newTodo = await trpc.createTodo.mutate(formData);
      setTodos((prev: Todo[]) => [newTodo, ...prev]);
      setFormData({
        title: '',
        description: null
      });
    } catch (error) {
      console.error('Failed to create todo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleComplete = async (todo: Todo) => {
    try {
      const updatedTodo = await trpc.updateTodo.mutate({
        id: todo.id,
        completed: !todo.completed
      });
      if (updatedTodo) {
        setTodos((prev: Todo[]) => 
          prev.map((t: Todo) => t.id === todo.id ? updatedTodo : t)
        );
      }
    } catch (error) {
      console.error('Failed to update todo:', error);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.title?.trim()) return;

    try {
      const updatedTodo = await trpc.updateTodo.mutate(editFormData);
      if (updatedTodo) {
        setTodos((prev: Todo[]) => 
          prev.map((t: Todo) => t.id === updatedTodo.id ? updatedTodo : t)
        );
        setEditingTodo(null);
      }
    } catch (error) {
      console.error('Failed to update todo:', error);
    }
  };

  const handleDelete = async (todoId: number) => {
    try {
      const success = await trpc.deleteTodo.mutate({ id: todoId });
      if (success) {
        setTodos((prev: Todo[]) => prev.filter((t: Todo) => t.id !== todoId));
      }
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  const startEdit = (todo: Todo) => {
    setEditingTodo(todo);
    setEditFormData({
      id: todo.id,
      title: todo.title,
      description: todo.description,
      completed: todo.completed
    });
  };

  const cancelEdit = () => {
    setEditingTodo(null);
    setEditFormData({
      id: 0,
      title: '',
      description: null,
      completed: false
    });
  };

  const completedCount = todos.filter((todo: Todo) => todo.completed).length;
  const totalCount = todos.length;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-center mb-2">✅ Todo App</h1>
        <p className="text-center text-muted-foreground">Stay organized and get things done!</p>
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-4 mb-8">
        <Badge variant="outline" className="text-sm px-4 py-2">
          📋 Total: {totalCount}
        </Badge>
        <Badge variant="default" className="text-sm px-4 py-2 bg-green-100 text-green-800 hover:bg-green-200">
          ✅ Completed: {completedCount}
        </Badge>
        <Badge variant="secondary" className="text-sm px-4 py-2">
          ⏳ Remaining: {totalCount - completedCount}
        </Badge>
      </div>

      {/* Create Todo Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>➕ Add New Todo</CardTitle>
          <CardDescription>Create a new task to keep track of</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <Input
              placeholder="What needs to be done? 🤔"
              value={formData.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateTodoInput) => ({ ...prev, title: e.target.value }))
              }
              required
            />
            <Textarea
              placeholder="Add some details... (optional) 📝"
              value={formData.description || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setFormData((prev: CreateTodoInput) => ({
                  ...prev,
                  description: e.target.value || null
                }))
              }
              rows={3}
            />
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? '⏳ Creating...' : '🚀 Add Todo'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Todo List */}
      {todos.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-semibold mb-2">All caught up!</h3>
            <p className="text-muted-foreground">No todos yet. Create one above to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {todos.map((todo: Todo) => (
            <Card key={todo.id} className={`transition-all ${todo.completed ? 'opacity-75 bg-green-50' : ''}`}>
              <CardContent className="pt-6">
                {editingTodo?.id === todo.id ? (
                  // Edit form
                  <form onSubmit={handleEditSubmit} className="space-y-4">
                    <Input
                      value={editFormData.title || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditFormData((prev: UpdateTodoInput) => ({ ...prev, title: e.target.value }))
                      }
                      required
                    />
                    <Textarea
                      value={editFormData.description || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setEditFormData((prev: UpdateTodoInput) => ({
                          ...prev,
                          description: e.target.value || null
                        }))
                      }
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button type="submit" size="sm">💾 Save</Button>
                      <Button type="button" variant="outline" size="sm" onClick={cancelEdit}>
                        ❌ Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  // Display mode
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={todo.completed}
                        onCheckedChange={() => handleToggleComplete(todo)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <h3 className={`text-lg font-semibold ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {todo.completed ? '✅' : '⏳'} {todo.title}
                        </h3>
                        {todo.description && (
                          <p className={`text-muted-foreground ${todo.completed ? 'line-through' : ''}`}>
                            {todo.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>📅 Created: {todo.created_at.toLocaleDateString()}</span>
                          <span>🕐 Updated: {todo.updated_at.toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(todo)}
                        >
                          ✏️ Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                              🗑️ Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Todo</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{todo.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(todo.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {todos.length > 0 && (
        <div className="mt-8 text-center">
          <Separator className="mb-4" />
          <p className="text-sm text-muted-foreground">
            💪 Keep going! You've got {totalCount - completedCount} tasks left to complete.
          </p>
        </div>
      )}
    </div>
  );
}

export default App;