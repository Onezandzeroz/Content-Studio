import { NextRequest, NextResponse } from 'next/server';
import { getTemplates, readTemplate, type ContentType } from '@/lib/content-generator';
import fs from 'fs/promises';
import path from 'path';

const CONTENT_DIR = path.join(process.cwd(), 'content');

// GET - List all templates or specific template content
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as ContentType | null;
    const template = searchParams.get('template');
    
    // If specific template requested
    if (type && template) {
      const content = await readTemplate(type, template);
      return NextResponse.json({
        success: true,
        data: {
          type,
          template,
          content
        }
      });
    }
    
    // Get all templates
    const templates: Record<string, string[]> = {};
    const types: ContentType[] = ['html', 'json', 'markdown'];
    
    for (const t of types) {
      templates[t] = await getTemplates(t);
    }
    
    return NextResponse.json({
      success: true,
      data: templates
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to get templates' },
      { status: 500 }
    );
  }
}
