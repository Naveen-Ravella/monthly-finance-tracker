import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { recurringTransactions } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';

const VALID_TYPES = ['income', 'expense'] as const;
const VALID_FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, amount, category, description, frequency, startDate, endDate, isActive } = body;

    // Validation - Required fields
    if (!type) {
      return NextResponse.json({ 
        error: "Type is required",
        code: "MISSING_TYPE" 
      }, { status: 400 });
    }

    if (!amount && amount !== 0) {
      return NextResponse.json({ 
        error: "Amount is required",
        code: "MISSING_AMOUNT" 
      }, { status: 400 });
    }

    if (!category) {
      return NextResponse.json({ 
        error: "Category is required",
        code: "MISSING_CATEGORY" 
      }, { status: 400 });
    }

    if (!frequency) {
      return NextResponse.json({ 
        error: "Frequency is required",
        code: "MISSING_FREQUENCY" 
      }, { status: 400 });
    }

    if (!startDate) {
      return NextResponse.json({ 
        error: "Start date is required",
        code: "MISSING_START_DATE" 
      }, { status: 400 });
    }

    // Validation - Type enum
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ 
        error: "Type must be either 'income' or 'expense'",
        code: "INVALID_TYPE" 
      }, { status: 400 });
    }

    // Validation - Amount must be positive
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ 
        error: "Amount must be a positive number",
        code: "INVALID_AMOUNT" 
      }, { status: 400 });
    }

    // Validation - Category not empty
    const trimmedCategory = category.trim();
    if (trimmedCategory.length === 0) {
      return NextResponse.json({ 
        error: "Category must not be empty",
        code: "EMPTY_CATEGORY" 
      }, { status: 400 });
    }

    // Validation - Frequency enum
    if (!VALID_FREQUENCIES.includes(frequency)) {
      return NextResponse.json({ 
        error: "Frequency must be one of: 'daily', 'weekly', 'monthly', 'yearly'",
        code: "INVALID_FREQUENCY" 
      }, { status: 400 });
    }

    // Validation - Start date is valid
    const parsedStartDate = new Date(startDate);
    if (isNaN(parsedStartDate.getTime())) {
      return NextResponse.json({ 
        error: "Start date must be a valid date string",
        code: "INVALID_START_DATE" 
      }, { status: 400 });
    }

    // Validation - End date (if provided) must be after start date
    let parsedEndDate = null;
    if (endDate) {
      parsedEndDate = new Date(endDate);
      if (isNaN(parsedEndDate.getTime())) {
        return NextResponse.json({ 
          error: "End date must be a valid date string",
          code: "INVALID_END_DATE" 
        }, { status: 400 });
      }
      if (parsedEndDate <= parsedStartDate) {
        return NextResponse.json({ 
          error: "End date must be after start date",
          code: "END_DATE_BEFORE_START" 
        }, { status: 400 });
      }
    }

    // Prepare insert data
    const insertData: any = {
      type,
      amount: parsedAmount,
      category: trimmedCategory,
      description: description ? description.trim() : null,
      frequency,
      startDate: parsedStartDate.toISOString(),
      endDate: parsedEndDate ? parsedEndDate.toISOString() : null,
      lastGenerated: null,
      isActive: isActive !== undefined ? (isActive === true || isActive === 1 || isActive === '1' ? 1 : 0) : 1,
      createdAt: new Date().toISOString()
    };

    const newRecurringTransaction = await db.insert(recurringTransactions)
      .values(insertData)
      .returning();

    return NextResponse.json(newRecurringTransaction[0], { status: 201 });

  } catch (error: any) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const isActiveParam = searchParams.get('isActive');
    const type = searchParams.get('type');

    // Single record by ID
    if (id) {
      const parsedId = parseInt(id);
      if (isNaN(parsedId)) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const record = await db.select()
        .from(recurringTransactions)
        .where(eq(recurringTransactions.id, parsedId))
        .limit(1);

      if (record.length === 0) {
        return NextResponse.json({ 
          error: 'Recurring transaction not found' 
        }, { status: 404 });
      }

      return NextResponse.json(record[0]);
    }

    // List with filters
    let query = db.select().from(recurringTransactions);
    const conditions: any[] = [];

    // Filter by isActive
    if (isActiveParam !== null) {
      const isActiveValue = isActiveParam === 'true' || isActiveParam === '1' ? 1 : 0;
      conditions.push(eq(recurringTransactions.isActive, isActiveValue));
    }

    // Filter by type
    if (type) {
      if (!VALID_TYPES.includes(type as any)) {
        return NextResponse.json({ 
          error: "Type must be either 'income' or 'expense'",
          code: "INVALID_TYPE" 
        }, { status: 400 });
      }
      conditions.push(eq(recurringTransactions.type, type));
    }

    // Apply filters
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    // Sort by createdAt DESC
    const results = await query.orderBy(desc(recurringTransactions.createdAt));

    return NextResponse.json(results);

  } catch (error: any) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ 
        error: "ID is required",
        code: "MISSING_ID" 
      }, { status: 400 });
    }

    const parsedId = parseInt(id);
    if (isNaN(parsedId)) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if record exists
    const existingRecord = await db.select()
      .from(recurringTransactions)
      .where(eq(recurringTransactions.id, parsedId))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ 
        error: 'Recurring transaction not found' 
      }, { status: 404 });
    }

    const body = await request.json();
    const { isActive, lastGenerated } = body;

    const updates: any = {};

    // Validate and prepare isActive update
    if (isActive !== undefined) {
      if (typeof isActive === 'boolean') {
        updates.isActive = isActive ? 1 : 0;
      } else if (isActive === 0 || isActive === 1 || isActive === '0' || isActive === '1') {
        updates.isActive = isActive === 1 || isActive === '1' ? 1 : 0;
      } else {
        return NextResponse.json({ 
          error: "isActive must be a boolean or 0/1",
          code: "INVALID_IS_ACTIVE" 
        }, { status: 400 });
      }
    }

    // Validate and prepare lastGenerated update
    if (lastGenerated !== undefined) {
      if (lastGenerated === null) {
        updates.lastGenerated = null;
      } else {
        const parsedDate = new Date(lastGenerated);
        if (isNaN(parsedDate.getTime())) {
          return NextResponse.json({ 
            error: "lastGenerated must be a valid date string",
            code: "INVALID_LAST_GENERATED" 
          }, { status: 400 });
        }
        updates.lastGenerated = parsedDate.toISOString();
      }
    }

    // Check if there are any updates
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(existingRecord[0]);
    }

    const updated = await db.update(recurringTransactions)
      .set(updates)
      .where(eq(recurringTransactions.id, parsedId))
      .returning();

    return NextResponse.json(updated[0]);

  } catch (error: any) {
    console.error('PATCH error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ 
        error: "ID is required",
        code: "MISSING_ID" 
      }, { status: 400 });
    }

    const parsedId = parseInt(id);
    if (isNaN(parsedId)) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if record exists
    const existingRecord = await db.select()
      .from(recurringTransactions)
      .where(eq(recurringTransactions.id, parsedId))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ 
        error: 'Recurring transaction not found' 
      }, { status: 404 });
    }

    const deleted = await db.delete(recurringTransactions)
      .where(eq(recurringTransactions.id, parsedId))
      .returning();

    return NextResponse.json({
      message: 'Recurring transaction deleted successfully',
      deleted: deleted[0]
    });

  } catch (error: any) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}