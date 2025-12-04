import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { budgets } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, limit } = body;

    // Validate required fields
    if (!category || typeof category !== 'string' || category.trim() === '') {
      return NextResponse.json({ 
        error: 'Category is required and must not be empty',
        code: 'INVALID_CATEGORY' 
      }, { status: 400 });
    }

    if (limit === undefined || limit === null || typeof limit !== 'number' || limit <= 0) {
      return NextResponse.json({ 
        error: 'Limit is required and must be a positive number',
        code: 'INVALID_LIMIT' 
      }, { status: 400 });
    }

    // Sanitize inputs
    const normalizedCategory = category.trim().toLowerCase();

    // Check if budget with this category already exists
    const existingBudget = await db.select()
      .from(budgets)
      .where(eq(budgets.category, normalizedCategory))
      .limit(1);

    if (existingBudget.length > 0) {
      // Update existing budget
      const updated = await db.update(budgets)
        .set({
          limit,
          updatedAt: new Date().toISOString()
        })
        .where(eq(budgets.category, normalizedCategory))
        .returning();

      return NextResponse.json(updated[0], { status: 200 });
    } else {
      // Create new budget
      const newBudget = await db.insert(budgets)
        .values({
          category: normalizedCategory,
          limit,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .returning();

      return NextResponse.json(newBudget[0], { status: 201 });
    }
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const category = searchParams.get('category');

    // Get single budget by ID
    if (id) {
      if (isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: 'Valid ID is required',
          code: 'INVALID_ID' 
        }, { status: 400 });
      }

      const budget = await db.select()
        .from(budgets)
        .where(eq(budgets.id, parseInt(id)))
        .limit(1);

      if (budget.length === 0) {
        return NextResponse.json({ 
          error: 'Budget not found',
          code: 'NOT_FOUND' 
        }, { status: 404 });
      }

      return NextResponse.json(budget[0], { status: 200 });
    }

    // Get single budget by category
    if (category) {
      const normalizedCategory = category.trim().toLowerCase();
      
      const budget = await db.select()
        .from(budgets)
        .where(eq(budgets.category, normalizedCategory))
        .limit(1);

      if (budget.length === 0) {
        return NextResponse.json({ 
          error: 'Budget not found',
          code: 'NOT_FOUND' 
        }, { status: 404 });
      }

      return NextResponse.json(budget[0], { status: 200 });
    }

    // Get all budgets sorted by category
    const allBudgets = await db.select()
      .from(budgets)
      .orderBy(asc(budgets.category));

    return NextResponse.json(allBudgets, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');

    // Validate category parameter
    if (!category || category.trim() === '') {
      return NextResponse.json({ 
        error: 'Category parameter is required',
        code: 'MISSING_CATEGORY' 
      }, { status: 400 });
    }

    const normalizedCategory = category.trim().toLowerCase();

    // Check if budget exists
    const existingBudget = await db.select()
      .from(budgets)
      .where(eq(budgets.category, normalizedCategory))
      .limit(1);

    if (existingBudget.length === 0) {
      return NextResponse.json({ 
        error: 'Budget not found',
        code: 'NOT_FOUND' 
      }, { status: 404 });
    }

    // Delete the budget
    const deleted = await db.delete(budgets)
      .where(eq(budgets.category, normalizedCategory))
      .returning();

    return NextResponse.json({ 
      message: 'Budget deleted successfully',
      budget: deleted[0]
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}