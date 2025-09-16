import { db } from '../db';
import { todosTable } from '../db/schema';
import { type CreateTodoInput, type Todo } from '../schema';

export const createTodo = async (input: CreateTodoInput): Promise<Todo> => {
  try {
    // Insert todo record with completed defaulting to false
    const result = await db.insert(todosTable)
      .values({
        title: input.title,
        description: input.description,
        completed: false // Default value for new todos
      })
      .returning()
      .execute();

    // Return the created todo (timestamps are already Date objects from database)
    return result[0];
  } catch (error) {
    console.error('Todo creation failed:', error);
    throw error;
  }
};