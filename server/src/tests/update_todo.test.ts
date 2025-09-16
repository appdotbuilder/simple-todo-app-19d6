import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { todosTable } from '../db/schema';
import { type CreateTodoInput, type UpdateTodoInput } from '../schema';
import { updateTodo } from '../handlers/update_todo';
import { eq } from 'drizzle-orm';

describe('updateTodo', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test todo
  const createTestTodo = async (todoData: CreateTodoInput = { 
    title: 'Test Todo', 
    description: 'Original description' 
  }) => {
    const result = await db.insert(todosTable)
      .values({
        title: todoData.title,
        description: todoData.description,
        completed: false
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should update todo title only', async () => {
    // Create a test todo
    const originalTodo = await createTestTodo();
    const originalUpdatedAt = originalTodo.updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateTodoInput = {
      id: originalTodo.id,
      title: 'Updated Title'
    };

    const result = await updateTodo(updateInput);

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(originalTodo.id);
    expect(result!.title).toEqual('Updated Title');
    expect(result!.description).toEqual(originalTodo.description); // Unchanged
    expect(result!.completed).toEqual(originalTodo.completed); // Unchanged
    expect(result!.created_at).toEqual(originalTodo.created_at); // Unchanged
    expect(result!.updated_at).not.toEqual(originalUpdatedAt); // Should be updated
  });

  it('should update todo description only', async () => {
    const originalTodo = await createTestTodo();

    const updateInput: UpdateTodoInput = {
      id: originalTodo.id,
      description: 'Updated description'
    };

    const result = await updateTodo(updateInput);

    expect(result).not.toBeNull();
    expect(result!.title).toEqual(originalTodo.title); // Unchanged
    expect(result!.description).toEqual('Updated description');
    expect(result!.completed).toEqual(originalTodo.completed); // Unchanged
  });

  it('should update completed status only', async () => {
    const originalTodo = await createTestTodo();

    const updateInput: UpdateTodoInput = {
      id: originalTodo.id,
      completed: true
    };

    const result = await updateTodo(updateInput);

    expect(result).not.toBeNull();
    expect(result!.title).toEqual(originalTodo.title); // Unchanged
    expect(result!.description).toEqual(originalTodo.description); // Unchanged
    expect(result!.completed).toEqual(true);
  });

  it('should update multiple fields at once', async () => {
    const originalTodo = await createTestTodo();

    const updateInput: UpdateTodoInput = {
      id: originalTodo.id,
      title: 'New Title',
      description: 'New description',
      completed: true
    };

    const result = await updateTodo(updateInput);

    expect(result).not.toBeNull();
    expect(result!.title).toEqual('New Title');
    expect(result!.description).toEqual('New description');
    expect(result!.completed).toEqual(true);
    expect(result!.created_at).toEqual(originalTodo.created_at); // Unchanged
    expect(result!.updated_at).not.toEqual(originalTodo.updated_at); // Should be updated
  });

  it('should set description to null when explicitly provided', async () => {
    const originalTodo = await createTestTodo();

    const updateInput: UpdateTodoInput = {
      id: originalTodo.id,
      description: null
    };

    const result = await updateTodo(updateInput);

    expect(result).not.toBeNull();
    expect(result!.description).toBeNull();
    expect(result!.title).toEqual(originalTodo.title); // Unchanged
  });

  it('should return null when todo does not exist', async () => {
    const nonExistentId = 99999;

    const updateInput: UpdateTodoInput = {
      id: nonExistentId,
      title: 'This should not work'
    };

    const result = await updateTodo(updateInput);

    expect(result).toBeNull();
  });

  it('should save changes to database', async () => {
    const originalTodo = await createTestTodo();

    const updateInput: UpdateTodoInput = {
      id: originalTodo.id,
      title: 'Database Updated Title',
      completed: true
    };

    await updateTodo(updateInput);

    // Verify the changes were persisted to the database
    const updatedTodoFromDB = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, originalTodo.id))
      .execute();

    expect(updatedTodoFromDB).toHaveLength(1);
    expect(updatedTodoFromDB[0].title).toEqual('Database Updated Title');
    expect(updatedTodoFromDB[0].completed).toEqual(true);
    expect(updatedTodoFromDB[0].description).toEqual(originalTodo.description); // Unchanged
    expect(updatedTodoFromDB[0].updated_at).not.toEqual(originalTodo.updated_at);
  });

  it('should always update timestamp even with no field changes', async () => {
    const originalTodo = await createTestTodo();
    const originalUpdatedAt = originalTodo.updated_at;

    // Wait to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Update with only the ID (no field changes)
    const updateInput: UpdateTodoInput = {
      id: originalTodo.id
    };

    const result = await updateTodo(updateInput);

    expect(result).not.toBeNull();
    expect(result!.updated_at).not.toEqual(originalUpdatedAt);
    expect(result!.title).toEqual(originalTodo.title);
    expect(result!.description).toEqual(originalTodo.description);
    expect(result!.completed).toEqual(originalTodo.completed);
  });

  it('should handle todo with null description initially', async () => {
    // Create todo with null description
    const originalTodo = await createTestTodo({ 
      title: 'Test Todo', 
      description: null 
    });

    expect(originalTodo.description).toBeNull();

    const updateInput: UpdateTodoInput = {
      id: originalTodo.id,
      title: 'Updated Title'
    };

    const result = await updateTodo(updateInput);

    expect(result).not.toBeNull();
    expect(result!.title).toEqual('Updated Title');
    expect(result!.description).toBeNull(); // Should remain null
  });
});