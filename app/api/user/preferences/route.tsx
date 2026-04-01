import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { userId, selections } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const totalSelections = 
      (selections.categoryIds?.filter(Boolean).length || 0) + 
      (selections.topicNames?.filter(Boolean).length || 0) + 
      (selections.style?.filter(Boolean).length || 0) + 
      (selections.sectors?.filter(Boolean).length || 0) + 
      (selections.schedule?.filter(Boolean).length || 0) + 
      (selections.format?.filter(Boolean).length || 0);

    if (totalSelections === 0) {
      return NextResponse.json(
        { error: "At least one preference must be selected to save your profile." },
        { status: 400 }
      );
    }

    const { error: prefError } = await supabase
      .from("user_preferences")
      .upsert({
        user_id: userId,
        tone: selections.style || [],      
        sector: selections.sectors || [],  
        schedule: selections.schedule || [],
        format: selections.format || [],
      }, { onConflict: 'user_id' });

    if (prefError) throw prefError;

    await supabase.from("user_category_prefs").delete().eq("user_id", userId);

    let finalCategoryIds: number[] = [];

    if (selections.categoryIds && selections.categoryIds.length > 0) {
      finalCategoryIds = selections.categoryIds;
    } 
    else if (selections.topicNames && selections.topicNames.length > 0) {
      const { data: categories } = await supabase
        .from("categories")
        .select("id")
        .in("name", selections.topicNames);
      
      if (categories) {
        finalCategoryIds = categories.map((c: { id: number }) => c.id);
      }
    }

    if (finalCategoryIds.length > 0) {
      const categoryRows = finalCategoryIds.map((id) => ({
        user_id: userId,
        category_id: id,
      }));

      const { error: insertErr } = await supabase
        .from("user_category_prefs")
        .insert(categoryRows);

      if (insertErr) throw insertErr;
    }

    return NextResponse.json({ success: true });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("API Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}