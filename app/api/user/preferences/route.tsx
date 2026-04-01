import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { userId, selections } = await req.json();

    // 1. Server-Side Validation
    // Don't save an entirely empty profile
    const totalSelections = 
      (selections.categoryIds?.length || 0) + 
      (selections.topicNames?.length || 0) + 
      (selections.style?.length || 0) + 
      (selections.sectors?.length || 0) + 
      (selections.schedule?.length || 0) + 
      (selections.format?.length || 0);

    if (totalSelections === 0) {
      return NextResponse.json(
        { error: "At least one preference must be selected to save your profile." },
        { status: 400 }
      );
    }

    // 2. Save core preferences (tone, sector, etc.)
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

    // 3. Handle Topics (user_category_prefs)
    await supabase.from("user_category_prefs").delete().eq("user_id", userId);

    let finalCategoryIds: number[] = [];

    // Check if coming from Onboarding (IDs) or Profile Page (Names)
    if (selections.categoryIds && selections.categoryIds.length > 0) {
      finalCategoryIds = selections.categoryIds;
    } 
    else if (selections.topicNames && selections.topicNames.length > 0) {
      const { data: categories } = await supabase
        .from("categories")
        .select("id")
        .in("name", selections.topicNames);
      
      if (categories) {
        finalCategoryIds = categories.map(c => c.id);
      }
    }

    // 4. Insert the Resolved IDs
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
  } catch (err: any) {
    console.error("API Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}