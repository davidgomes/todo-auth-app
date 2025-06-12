
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import type { 
  SignUpInput, 
  SignInInput, 
  AuthResponse, 
  Todo, 
  CreateTodoInput, 
  UpdateTodoInput,
  DeleteTodoInput 
} from '../../server/src/schema';

interface AuthState {
  isAuthenticated: boolean;
  user: { id: number; email: string } | null;
  token: string | null;
}

function App() {
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null
  });
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth form state
  const [signUpData, setSignUpData] = useState<SignUpInput>({
    email: '',
    password: ''
  });
  const [signInData, setSignInData] = useState<SignInInput>({
    email: '',
    password: ''
  });

  // Todo form state
  const [todoForm, setTodoForm] = useState<CreateTodoInput>({
    title: '',
    description: null
  });

  // Filter state
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Check for stored auth on component mount
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      try {
        const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
        setAuth({
          isAuthenticated: true,
          user: userData,
          token: storedToken
        });
      } catch (error) {
        console.error('Failed to restore auth state:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
      }
    }
  }, []);

  // Set up tRPC auth header
  useEffect(() => {
    if (auth.token) {
      // Update tRPC client headers
      (trpc as unknown as { _def: { _config: { links: Array<{ headers?: Record<string, string> }> } } })._def._config.links[0].headers = {
        Authorization: `Bearer ${auth.token}`
      };
    }
  }, [auth.token]);

  const loadTodos = useCallback(async () => {
    if (!auth.isAuthenticated) return;
    
    try {
      setIsLoading(true);
      const result = await trpc.getTodos.query();
      setTodos(result);
      setError(null);
    } catch (error) {
      console.error('Failed to load todos:', error);
      setError('Failed to load todos');
    } finally {
      setIsLoading(false);
    }
  }, [auth.isAuthenticated]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const response: AuthResponse = await trpc.signUp.mutate(signUpData);
      setAuth({
        isAuthenticated: true,
        user: response.user,
        token: response.token
      });
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('user_data', JSON.stringify(response.user));
      setSignUpData({ email: '', password: '' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const response: AuthResponse = await trpc.signIn.mutate(signInData);
      setAuth({
        isAuthenticated: true,
        user: response.user,
        token: response.token
      });
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('user_data', JSON.stringify(response.user));
      setSignInData({ email: '', password: '' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    setAuth({
      isAuthenticated: false,
      user: null,
      token: null
    });
    setTodos([]);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  };

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!todoForm.title.trim()) return;
    
    setIsLoading(true);
    try {
      const response: Todo = await trpc.createTodo.mutate(todoForm);
      setTodos((prev: Todo[]) => [response, ...prev]);
      setTodoForm({ title: '', description: null });
      setError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create todo';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTodo = async (todo: Todo) => {
    try {
      const updateData: UpdateTodoInput = {
        id: todo.id,
        completed: !todo.completed
      };
      const response: Todo = await trpc.updateTodo.mutate(updateData);
      setTodos((prev: Todo[]) => 
        prev.map((t: Todo) => t.id === todo.id ? response : t)
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update todo';
      setError(errorMessage);
    }
  };

  const handleDeleteTodo = async (todoId: number) => {
    try {
      const deleteData: DeleteTodoInput = { id: todoId };
      await trpc.deleteTodo.mutate(deleteData);
      setTodos((prev: Todo[]) => prev.filter((t: Todo) => t.id !== todoId));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete todo';
      setError(errorMessage);
    }
  };

  const filteredTodos = todos.filter((todo: Todo) => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const completedCount = todos.filter((todo: Todo) => todo.completed).length;
  const activeCount = todos.length - completedCount;

  if (!auth.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-indigo-700">📝 Todo App</CardTitle>
            <CardDescription>Sign in to manage your tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      type="email"
                      placeholder="Email"
                      value={signInData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSignInData((prev: SignInInput) => ({ ...prev, email: e.target.value }))
                      }
                      required
                    />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={signInData.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSignInData((prev: SignInInput) => ({ ...prev, password: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      type="email"
                      placeholder="Email"
                      value={signUpData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSignUpData((prev: SignUpInput) => ({ ...prev, email: e.target.value }))
                      }
                      required
                    />
                    <Input
                      type="password"
                      placeholder="Password (min 6 characters)"
                      value={signUpData.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSignUpData((prev: SignUpInput) => ({ ...prev, password: e.target.value }))
                      }
                      minLength={6}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creating account...' : 'Sign Up'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            
            {error && (
              <Alert className="mt-4 border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-indigo-700">📝 My Todos</h1>
            <p className="text-gray-600">Welcome back, {auth.user?.email}</p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>

        {/* Todo Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{todos.length}</div>
              <div className="text-sm text-gray-600">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{activeCount}</div>
              <div className="text-sm text-gray-600">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{completedCount}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </CardContent>
          </Card>
        </div>

        {/* Create Todo Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ✨ Add New Todo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTodo} className="space-y-4">
              <Input
                placeholder="What needs to be done?"
                value={todoForm.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTodoForm((prev: CreateTodoInput) => ({ ...prev, title: e.target.value }))
                }
                required
              />
              <Textarea
                placeholder="Add a description (optional)"
                value={todoForm.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setTodoForm((prev: CreateTodoInput) => ({
                    ...prev,
                    description: e.target.value || null
                  }))
                }
                rows={3}
              />
              <Button type="submit" disabled={isLoading || !todoForm.title.trim()}>
                {isLoading ? 'Adding...' : '➕ Add Todo'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Filter Tabs */}
        <div className="mb-4">
          <Tabs value={filter} onValueChange={(value) => setFilter(value as 'all' | 'active' | 'completed')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All ({todos.length})</TabsTrigger>
              <TabsTrigger value="active">Active ({activeCount})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedCount})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        {/* Todo List */}
        <div className="space-y-3">
          {filteredTodos.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-6xl mb-4">
                  {filter === 'completed' ? '🎉' : filter === 'active' ? '📝' : '📋'}
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  {filter === 'completed' 
                    ? 'No completed todos yet'
                    : filter === 'active' 
                    ? 'No active todos'
                    : 'No todos yet'
                  }
                </h3>
                <p className="text-gray-500">
                  {filter === 'completed' 
                    ? 'Complete some tasks to see them here!'
                    : filter === 'active' 
                    ? 'All tasks are completed! 🎉'
                    : 'Add your first todo above to get started!'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredTodos.map((todo: Todo) => (
              <Card key={todo.id} className={`transition-all duration-200 ${todo.completed ? 'bg-green-50 border-green-200' : 'bg-white hover:shadow-md'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={todo.completed}
                      onCheckedChange={() => handleToggleTodo(todo)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-medium ${todo.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {todo.title}
                        </h3>
                        {todo.completed && <Badge variant="secondary" className="bg-green-100 text-green-800">✓ Done</Badge>}
                      </div>
                      {todo.description && (
                        <p className={`text-sm mb-2 ${todo.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                          {todo.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>Created {todo.created_at.toLocaleDateString()}</span>
                        {todo.updated_at.getTime() !== todo.created_at.getTime() && (
                          <span>Updated {todo.updated_at.toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                          🗑️
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
                          <AlertDialogAction onClick={() => handleDeleteTodo(todo.id)} className="bg-red-600 hover:bg-red-700">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <Separator className="mb-4" />
          <p>Made with ❤️ using React + tRPC</p>
        </div>
      </div>
    </div>
  );
}

export default App;
