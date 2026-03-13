import { NextRequest, NextResponse } from 'next/server';
import { saveAttachment, listAttachments, deleteAttachment } from '@/lib/content-generator';

// GET - List all attachments
export async function GET() {
  try {
    const attachments = await listAttachments();
    
    return NextResponse.json({
      success: true,
      data: attachments
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to list attachments' },
      { status: 500 }
    );
  }
}

// POST - Upload new attachment
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }
    
    const result = await saveAttachment(file);
    
    return NextResponse.json({
      success: true,
      data: {
        filename: result.filename,
        path: result.path,
        size: result.size
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

// DELETE - Delete attachment
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    
    if (!filename) {
      return NextResponse.json(
        { success: false, error: 'Filename is required' },
        { status: 400 }
      );
    }
    
    await deleteAttachment(filename);
    
    return NextResponse.json({
      success: true,
      message: 'Attachment deleted successfully'
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to delete attachment' },
      { status: 500 }
    );
  }
}
