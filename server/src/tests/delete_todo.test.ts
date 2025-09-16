import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { todosTable } from '../db/schema';
import { type DeleteTodoInput, type CreateTodoInput } from '../schema';
import { deleteTodo } from '../handlers/delete_todo';
import { eq } from 'drizzle-orm';

// Helper function to create a test todo
const createTestTodo = async (input: CreateTodoInput) => {
  const result = await db.insert(todosTable)
    .values({
      title: input.title,
      description: input.description
    })
    .returning()
    .execute();
  
  return result[0];
};

describe('deleteTodo', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing todo', async () => {
    // Create a test todo first
    const testTodo = await createTestTodo({
      title: 'Test Todo',
      description: 'A todo to be deleted'
    });

    const deleteInput: DeleteTodoInput = {
      id: testTodo.id
    };

    // Delete the todo
    const result = await deleteTodo(deleteInput);

    // Should return true for successful deletion
    expect(result).toBe(true);

    // Verify todo is actually deleted from database
    const remainingTodos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, testTodo.id))
      .execute();

    expect(remainingTodos).toHaveLength(0);
  });

  it('should return false for non-existent todo', async () => {
    const deleteInput: DeleteTodoInput = {
      id: 99999 // Non-existent ID
    };

    // Try to delete non-existent todo
    const result = await deleteTodo(deleteInput);

    // Should return false for non-existent todo
    expect(result).toBe(false);
  });

  it('should not affect other todos when deleting one', async () => {
    // Create multiple test todos
    const todo1 = await createTestTodo({
      title: 'Todo 1',
      description: 'First todo'
    });

    const todo2 = await createTestTodo({
      title: 'Todo 2',
      description: 'Second todo'
    });

    const todo3 = await createTestTodo({
      title: 'Todo 3',
      description: 'Third todo'
    });

    // Delete only the middle todo
    const deleteInput: DeleteTodoInput = {
      id: todo2.id
    };

    const result = await deleteTodo(deleteInput);
    expect(result).toBe(true);

    // Verify other todos still exist
    const remainingTodos = await db.select()
      .from(todosTable)
      .execute();

    expect(remainingTodos).toHaveLength(2);
    
    const remainingIds = remainingTodos.map(todo => todo.id);
    expect(remainingIds).toContain(todo1.id);
    expect(remainingIds).toContain(todo3.id);
    expect(remainingIds).not.toContain(todo2.id);
  });

  it('should handle multiple deletion attempts gracefully', async () => {
    // Create a test todo
    const testTodo = await createTestTodo({
      title: 'Test Todo',
      description: 'A todo to be deleted twice'
    });

    const deleteInput: DeleteTodoInput = {
      id: testTodo.id
    };

    // First deletion should succeed
    const firstResult = await deleteTodo(deleteInput);
    expect(firstResult).toBe(true);

    // Second deletion of the same todo should return false
    const secondResult = await deleteTodo(deleteInput);
    expect(secondResult).toBe(false);
  });

  it('should delete todo with null description', async () => {
    // Create a todo with null description
    const testTodo = await createTestTodo({
      title: 'Todo with null description',
      description: null
    });

    const deleteInput: DeleteTodoInput = {
      id: testTodo.id
    };

    const result = await deleteTodo(deleteInput);
    expect(result).toBe(true);

    // Verify deletion
    const remainingTodos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, testTodo.id))
      .execute();

    expect(remainingTodos).toHaveLength(0);
  });

  it('should delete completed todo', async () => {
    // Create a completed todo
    const result = await db.insert(todosTable)
      .values({
        title: 'Completed Todo',
        description: 'This todo is completed',
        completed: true
      })
      .returning()
      .execute();

    const testTodo = result[0];

    const deleteInput: DeleteTodoInput = {
      id: testTodo.id
    };

    const deleteResult = await deleteTodo(deleteInput);
    expect(deleteResult).toBe(true);

    // Verify deletion
    const remainingTodos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, testTodo.id))
      .execute();

    expect(remainingTodos).toHaveLength(0);
  });
});