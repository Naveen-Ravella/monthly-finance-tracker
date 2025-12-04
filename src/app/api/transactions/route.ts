import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { transactions } from '@/db/schema';
import { eq, like, and, gte, lte, desc, or } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, amount, category, description, date, recurringId } = body;

    // Validate required fields
    if (!type) {
      return NextResponse.json(
        { error: 'Type is required', code: 'MISSING_TYPE' },
        { status: 400 }
      );
    }

    if (!amount && amount !== 0) {
      return NextResponse.json(
        { error: 'Amount is required', code: 'MISSING_AMOUNT' },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: 'Category is required', code: 'MISSING_CATEGORY' },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required', code: 'MISSING_DATE' },
        { status: 400 }
      );
    }

    // Validate type
    const trimmedType = type.trim().toLowerCase();
    if (trimmedType !== 'income' && trimmedType !== 'expense') {
      return NextResponse.json(
        { error: 'Type must be either "income" or "expense"', code: 'INVALID_TYPE' },
        { status: 400 }
      );
    }

    // Validate amount
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number', code: 'INVALID_AMOUNT' },
        { status: 400 }
      );
    }

    // Validate category
    const trimmedCategory = category.trim();
    if (trimmedCategory.length === 0) {
      return NextResponse.json(
        { error: 'Category must not be empty', code: 'EMPTY_CATEGORY' },
        { status: 400 }
      );
    }

    // Validate date
    const trimmedDate = date.trim();
    const dateObj = new Date(trimmedDate);
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json(
        { error: 'Date must be a valid date string', code: 'INVALID_DATE' },
        { status: 400 }
      );
    }

    // Prepare insert data
    const insertData: any = {
      type: trimmedType,
      amount: numAmount,
      category: trimmedCategory,
      date: trimmedDate,
      createdAt: new Date().toISOString()
    };

    // Add optional fields
    if (description !== undefined && description !== null) {
      insertData.description = description.trim();
    }

    if (recurringId !== undefined && recurringId !== null) {
      const numRecurringId = parseInt(recurringId);
      if (!isNaN(numRecurringId)) {
        insertData.recurringId = numRecurringId;
      }
    }

    // Insert transaction
    const newTransaction = await db.insert(transactions)
      .values(insertData)
      .returning();

    return NextResponse.json(newTransaction[0], { status: 201 });

  } catch (error: any) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single transaction by ID
    if (id) {
      const numId = parseInt(id);
      if (isNaN(numId)) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const transaction = await db.select()
        .from(transactions)
        .where(eq(transactions.id, numId))
        .limit(1);

      if (transaction.length === 0) {
        return NextResponse.json(
          { error: 'Transaction not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(transaction[0], { status: 200 });
    }

    // List transactions with filters
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Build where conditions
    const conditions = [];

    if (type) {
      const trimmedType = type.trim().toLowerCase();
      if (trimmedType === 'income' || trimmedType === 'expense') {
        conditions.push(eq(transactions.type, trimmedType));
      }
    }

    if (category) {
      const trimmedCategory = category.trim();
      conditions.push(like(transactions.category, `%${trimmedCategory}%`));
    }

    if (startDate) {
      const trimmedStartDate = startDate.trim();
      conditions.push(gte(transactions.date, trimmedStartDate));
    }

    if (endDate) {
      const trimmedEndDate = endDate.trim();
      conditions.push(lte(transactions.date, trimmedEndDate));
    }

    // Execute query
    let query = db.select().from(transactions);

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(transactions.date))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });

  } catch (error: any) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const numId = parseInt(id);

    // Check if transaction exists
    const existing = await db.select()
      .from(transactions)
      .where(eq(transactions.id, numId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Transaction not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Delete transaction
    const deleted = await db.delete(transactions)
      .where(eq(transactions.id, numId))
      .returning();

    return NextResponse.json(
      {
        message: 'Transaction deleted successfully',
        transaction: deleted[0]
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}