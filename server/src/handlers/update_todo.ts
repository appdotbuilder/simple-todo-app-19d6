import { db } from '../db';
import { todosTable } from '../db/schema';
import { type UpdateTodoInput, type Todo } from '../schema';
import { eq } from 'drizzle-orm';

export const updateTodo = async (input: UpdateTodoInput): Promise<Todo | null> => {
  try {
    // Build the update object only with provided fields
    const updateData: any = {
      updated_at: new Date() // Always update the timestamp
    };

    // Only include fields that were actually provided
    if (input.title !== undefined) {
      updateData.title = input.title;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.completed !== undefined) {
      updateData.completed = input.completed;
    }

    // Update the todo and return the updated record
    const result = await db.update(todosTable)
      .set(updateData)
      .where(eq(todosTable.id, input.id))
      .returning()
      .execute();

    // Return the updated todo or null if not found
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Todo update failed:', error);
    throw error;
  }
};