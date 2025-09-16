import { db } from '../db';
import { todosTable } from '../db/schema';
import { type Todo } from '../schema';
import { desc } from 'drizzle-orm';

export const getTodos = async (): Promise<Todo[]> => {
  try {
    // Query all todos ordered by created_at descending (newest first)
    const results = await db.select()
      .from(todosTable)
      .orderBy(desc(todosTable.created_at))
      .execute();

    // Return todos - no numeric conversions needed since no numeric columns
    return results;
  } catch (error) {
    console.error('Failed to fetch todos:', error);
    throw error;
  }
};