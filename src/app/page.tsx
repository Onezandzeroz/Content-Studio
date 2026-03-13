'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  FileText, 
  Code, 
  FileJson, 
  Upload, 
  Trash2, 
  Copy, 
  Download, 
  Loader2,
  FolderOpen,
  RefreshCw,
  Eye,
  X,
  Image as ImageIcon,
  Video,
  Link,
  Plus,
  Check,
  Layout
} from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/theme-toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import ReactMarkdown from 'react-markdown';

type ContentType = 'html' | 'json' | 'markdown';

interface ContentItem {
  name: string;
  path: string;
  type: ContentType;
  size: number;
  createdAt: string;
  modifiedAt: string;
  linkedContent?: string[];
}

interface AttachmentItem {
  name: string;
  path: string;
  type: string;
  size: number;
  createdAt: string;
  modifiedAt: string;
  linkedContent?: string[];
  mimeType?: string;
}

interface Templates {
  html: string[];
  json: string[];
  markdown: string[];
}

interface LinkItem {
  id: string;
  url: string;
  title: string;
}

// Prompt templates
const promptTemplates = [
  {
    id: 'projekt-case',
    name: 'Projekt case',
    prompt: 'Skriv en case study om denne nye ventilationsløsning som inkluderer: udfordring, løsning, resultater/besparelser og kundetilfredshed. Inkluder vedhæftede projektbilleder.',
    template: 'projekt-case'
  },
  {
    id: 'industrielt-projekt-case',
    name: 'Industrielt projekt case',
    prompt: 'Case study om ventilationsopgradering hos kunde der inkluderer: før-problemer, installation, målbare forbedringer. Vedhæft tekniske billeder.',
    template: 'industrielt-projekt-case'
  },
  {
    id: 'teknisk-artikel',
    name: 'Teknisk artikel',
    prompt: 'Skriv en teknisk artikel: Forklar princip, fordele og anvendelse.',
    template: 'teknisk-artikel'
  },
  {
    id: 'innovation',
    name: 'Innovation',
    prompt: 'Teknisk blog: Beskriv teknologi, fordele for miljø og indeklima og tilføj envetuelle diagram -er.',
    template: 'innovation'
  },
  {
    id: 'ny-medarbejder',
    name: 'Ny medarbejder',
    prompt: 'Præsenter ny medarbejder [navn] som [rolle]: kort baggrund, ekspertise og glæde ved at være med i teamet. Vedhæft portrætbillede.',
    template: 'ny-medarbejder'
  },
  {
    id: 'teambuilding',
    name: 'Teambuilding',
    prompt: 'Skriv nyhedspost: Fremhæv aktiviteter, samvær og motivation. Inkluder gruppebillede og sted.',
    template: 'teambuilding'
  },
  {
    id: 'social-post',
    name: 'Social post',
    prompt: 'Lav kort social post som inkludere: højdepunkter, holdstemning og billeder. Brug venlig, engagerende tone med hashtag.',
    template: 'social-post'
  },
  {
    id: 'firmaevent-social',
    name: 'Firmaevent social',
    prompt: 'Generer social post om firmaaften [begivenhed]: stemning, højdepunkter og tak til alle. Brug vedhæftede festbilleder og emoji.',
    template: 'firmaevent-social'
  }
];

export default function ContentStudio() {
  // State
  const [activeTab, setActiveTab] = useState('generate');
  const [contentType, setContentType] = useState<ContentType>('markdown');
  const [template, setTemplate] = useState<string>('__none__');
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [filename, setFilename] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [lastGeneratedFilename, setLastGeneratedFilename] = useState<string>('');
  
  // Attachment state for generation
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  
  const [contentList, setContentList] = useState<ContentItem[]>([]);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [templates, setTemplates] = useState<Templates>({ html: [], json: [], markdown: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedContent, setSelectedContent] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [selectedContentType, setSelectedContentType] = useState<ContentType | null>(null);
  
  // Preview mode state
  const [generatePreviewMode, setGeneratePreviewMode] = useState<'code' | 'layout'>('code');
  const [contentPreviewMode, setContentPreviewMode] = useState<'code' | 'layout'>('code');
  
  // Prompt template state
  const [selectedPromptTemplate, setSelectedPromptTemplate] = useState<string>('');

  // Handle prompt template selection
  const handlePromptTemplateChange = (templateId: string) => {
    if (templateId === '__none__') {
      setSelectedPromptTemplate('');
      setTemplate('__none__');
      return;
    }
    const selectedTemplate = promptTemplates.find(t => t.id === templateId);
    if (selectedTemplate) {
      setSelectedPromptTemplate(templateId);
      setPrompt(selectedTemplate.prompt);
      setTemplate(selectedTemplate.template);
    }
  };

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      if (data.success) {
        setTemplates(data.data);
      }
    } catch {
      toast.error('Failed to load templates');
    }
  }, []);

  // Fetch content list
  const fetchContentList = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/content');
      const data = await res.json();
      if (data.success) {
        setContentList(data.data);
      }
    } catch {
      toast.error('Failed to load content');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch attachments
  const fetchAttachments = useCallback(async () => {
    try {
      const res = await fetch('/api/upload');
      const data = await res.json();
      if (data.success) {
        setAttachments(data.data);
      }
    } catch {
      toast.error('Failed to load attachments');
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTemplates();
    fetchContentList();
    fetchAttachments();
  }, [fetchTemplates, fetchContentList, fetchAttachments]);

  // Toggle attachment selection
  const toggleAttachment = (path: string) => {
    setSelectedAttachments(prev => 
      prev.includes(path) 
        ? prev.filter(p => p !== path)
        : [...prev, path]
    );
  };

  // Add link
  const addLink = () => {
    if (!newLinkUrl.trim()) {
      toast.error('Please enter a URL');
      return;
    }
    
    const newLink: LinkItem = {
      id: Date.now().toString(),
      url: newLinkUrl,
      title: newLinkTitle || newLinkUrl
    };
    
    setLinks(prev => [...prev, newLink]);
    setNewLinkUrl('');
    setNewLinkTitle('');
    toast.success('Link added');
  };

  // Remove link
  const removeLink = (id: string) => {
    setLinks(prev => prev.filter(l => l.id !== id));
  };

  // Generate content
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          contentType,
          template: template === '__none__' ? undefined : template,
          title: title || undefined,
          filename: filename || undefined,
          additionalContext: additionalContext || undefined,
          attachments: selectedAttachments.length > 0 ? selectedAttachments : undefined,
          links: links.length > 0 ? links : undefined
        })
      });

      const data = await res.json();
      if (data.success) {
        setGeneratedContent(data.data.content);
        setLastGeneratedFilename(data.data.filename);
        toast.success(`Content generated and saved as ${data.data.filename}`);
        fetchContentList();
        fetchAttachments(); // Refresh to show linked content
        // Clear form
        setPrompt('');
        setSelectedPromptTemplate('');
        setTemplate('__none__');
        setTitle('');
        setFilename('');
        setAdditionalContext('');
        setSelectedAttachments([]);
        setLinks([]);
      } else {
        toast.error(data.error || 'Failed to generate content');
      }
    } catch {
      toast.error('Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  };

  // View content
  const handleViewContent = async (item: ContentItem) => {
    try {
      const res = await fetch(`/api/content/${item.type}/${item.name}`);
      const content = await res.text();
      setSelectedContent(item.name);
      setPreviewContent(content);
      setSelectedContentType(item.type);
    } catch {
      toast.error('Failed to load content');
    }
  };

  // Delete content
  const handleDeleteContent = async (item: ContentItem) => {
    if (!confirm(`Delete ${item.name}?`)) return;

    try {
      const res = await fetch(`/api/content/${item.type}/${item.name}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Content deleted');
        fetchContentList();
        if (selectedContent === item.name) {
          setSelectedContent(null);
          setPreviewContent('');
          setSelectedContentType(null);
        }
      }
    } catch {
      toast.error('Failed to delete content');
    }
  };

  // Copy content
  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  // Download content
  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, forGeneration: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`File uploaded: ${data.data.filename}`);
        fetchAttachments();
        
        // Auto-select for generation if uploaded from generate page
        if (forGeneration) {
          setSelectedAttachments(prev => [...prev, data.data.path]);
        }
      } else {
        toast.error(data.error || 'Failed to upload file');
      }
    } catch {
      toast.error('Failed to upload file');
    }

    // Reset input
    e.target.value = '';
  };

  // Delete attachment
  const handleDeleteAttachment = async (filename: string) => {
    if (!confirm(`Delete ${filename}?`)) return;

    try {
      const res = await fetch(`/api/upload?filename=${filename}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Attachment deleted');
        fetchAttachments();
      }
    } catch {
      toast.error('Failed to delete attachment');
    }
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get content type icon
  const getTypeIcon = (type: ContentType) => {
    switch (type) {
      case 'html': return <Code className="h-4 w-4" />;
      case 'json': return <FileJson className="h-4 w-4" />;
      case 'markdown': return <FileText className="h-4 w-4" />;
    }
  };

  // Get content type color
  const getTypeColor = (type: ContentType) => {
    switch (type) {
      case 'html': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'json': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'markdown': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    }
  };

  // Get attachment type icon
  const getAttachmentIcon = (item: AttachmentItem) => {
    const name = item.name.toLowerCase();
    if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name)) return <ImageIcon className="h-4 w-4 text-blue-500" />;
    if (/\.(mp4|webm|mov|avi)$/i.test(name)) return <Video className="h-4 w-4 text-red-500" />;
    return <FileText className="h-4 w-4 text-gray-500" />;
  };

  // Check if attachment is image
  const isImage = (name: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);
  
  // Check if attachment is video
  const isVideo = (name: string) => /\.(mp4|webm|mov|avi)$/i.test(name);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary p-2">
                <FileText className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Content Studio</h1>
                <p className="text-sm text-muted-foreground">AI-powered content generation</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={() => { fetchContentList(); fetchAttachments(); }}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="content">Content ({contentList.length})</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="attachments">Attachments ({attachments.length})</TabsTrigger>
          </TabsList>

          {/* Generate Tab */}
          <TabsContent value="generate">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Input Form */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Generate Content</CardTitle>
                    <CardDescription>
                      Use AI to create structured content for web applications
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Content Type */}
                    <div className="space-y-2">
                      <Label>Content Type</Label>
                      <Select value={contentType} onValueChange={(v) => { setContentType(v as ContentType); setTemplate('__none__'); }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="markdown">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Markdown (.md)
                            </div>
                          </SelectItem>
                          <SelectItem value="html">
                            <div className="flex items-center gap-2">
                              <Code className="h-4 w-4" />
                              HTML (.html)
                            </div>
                          </SelectItem>
                          <SelectItem value="json">
                            <div className="flex items-center gap-2">
                              <FileJson className="h-4 w-4" />
                              JSON (.json)
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Template */}
                    <div className="space-y-2">
                      <Label>Template (optional)</Label>
                      <Select value={template} onValueChange={setTemplate}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a template" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {templates[contentType]?.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                      <Label>Title (optional)</Label>
                      <Input
                        placeholder="Content title or topic"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>

                    {/* Prompt */}
                    <div className="space-y-2">
                      <Label>Prompt *</Label>
                      <Textarea
                        placeholder="Describe the content you want to generate..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={4}
                      />
                      
                      {/* Prompt Templates Dropdown */}
                      <div className="flex items-center gap-2">
                        <Select value={selectedPromptTemplate} onValueChange={handlePromptTemplateChange}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Vælg promptskabelon..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Ingen skabelon</SelectItem>
                            {promptTemplates.map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedPromptTemplate && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-xs"
                            onClick={() => {
                              setSelectedPromptTemplate('');
                              setPrompt('');
                              setTemplate('__none__');
                            }}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Ryd
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Additional Context */}
                    <div className="space-y-2">
                      <Label>Additional Context (optional)</Label>
                      <Textarea
                        placeholder="Any additional context or requirements..."
                        value={additionalContext}
                        onChange={(e) => setAdditionalContext(e.target.value)}
                        rows={2}
                      />
                    </div>

                    {/* Filename */}
                    <div className="space-y-2">
                      <Label>Filename (optional)</Label>
                      <Input
                        placeholder="custom-filename (extension added automatically)"
                        value={filename}
                        onChange={(e) => setFilename(e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Attachments Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Attachments
                    </CardTitle>
                    <CardDescription>
                      Add images, videos, and links to incorporate into your content
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Quick Upload */}
                    <div className="space-y-2">
                      <Label className="text-sm">Quick Upload</Label>
                      <div className="flex gap-2">
                        <input
                          type="file"
                          id="quick-upload"
                          className="hidden"
                          accept="image/*,video/*"
                          onChange={(e) => handleFileUpload(e, true)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('quick-upload')?.click()}
                          className="flex-1"
                        >
                          <ImageIcon className="h-4 w-4 mr-2" />
                          Add Image
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('quick-upload-video')?.click()}
                          className="flex-1"
                        >
                          <Video className="h-4 w-4 mr-2" />
                          Add Video
                        </Button>
                        <input
                          type="file"
                          id="quick-upload-video"
                          className="hidden"
                          accept="video/*"
                          onChange={(e) => handleFileUpload(e, true)}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Available Attachments */}
                    <div className="space-y-2">
                      <Label className="text-sm">Select from Library ({attachments.length} available)</Label>
                      <ScrollArea className="h-[150px] rounded-md border">
                        {attachments.length === 0 ? (
                          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                            No attachments uploaded yet
                          </div>
                        ) : (
                          <div className="p-2 space-y-1">
                            {attachments.map((item) => (
                              <div
                                key={item.path}
                                className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                                  selectedAttachments.includes(item.path) 
                                    ? 'bg-primary/10 border-primary' 
                                    : 'hover:bg-muted'
                                }`}
                                onClick={() => toggleAttachment(item.path)}
                              >
                                <Checkbox 
                                  checked={selectedAttachments.includes(item.path)}
                                  onCheckedChange={() => toggleAttachment(item.path)}
                                />
                                {getAttachmentIcon(item)}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm truncate">{item.name}</p>
                                  <p className="text-xs text-muted-foreground">{formatSize(item.size)}</p>
                                </div>
                                {isImage(item.name) && (
                                  <Badge variant="outline" className="text-xs">Image</Badge>
                                )}
                                {isVideo(item.name) && (
                                  <Badge variant="outline" className="text-xs">Video</Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </div>

                    <Separator />

                    {/* Links Section */}
                    <div className="space-y-2">
                      <Label className="text-sm">External Links</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="URL"
                          value={newLinkUrl}
                          onChange={(e) => setNewLinkUrl(e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="Title (optional)"
                          value={newLinkTitle}
                          onChange={(e) => setNewLinkTitle(e.target.value)}
                          className="w-32"
                        />
                        <Button size="icon" onClick={addLink}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {links.length > 0 && (
                        <div className="space-y-1 mt-2">
                          {links.map((link) => (
                            <div
                              key={link.id}
                              className="flex items-center gap-2 p-2 rounded border bg-muted/50"
                            >
                              <Link className="h-4 w-4 text-blue-500" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">{link.title}</p>
                                <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => removeLink(link.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Selected Summary */}
                    {(selectedAttachments.length > 0 || links.length > 0) && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {selectedAttachments.length > 0 && (
                          <Badge variant="secondary">
                            {selectedAttachments.length} attachment{selectedAttachments.length > 1 ? 's' : ''} selected
                          </Badge>
                        )}
                        {links.length > 0 && (
                          <Badge variant="secondary">
                            {links.length} link{links.length > 1 ? 's' : ''} added
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => { setSelectedAttachments([]); setLinks([]); }}
                        >
                          Clear all
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Button 
                  className="w-full" 
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Content
                    </>
                  )}
                </Button>
              </div>

              {/* Preview */}
              <Card className="lg:sticky lg:top-6 lg:self-start">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Preview</CardTitle>
                      <CardDescription>Generated content will appear here</CardDescription>
                    </div>
                    {generatedContent && (
                      <div className="flex items-center gap-2">
                        {/* Preview Mode Toggle */}
                        <ToggleGroup type="single" value={generatePreviewMode} onValueChange={(v) => v && setGeneratePreviewMode(v as 'code' | 'layout')} size="sm">
                          <ToggleGroupItem value="code" aria-label="Code preview">
                            <Code className="h-4 w-4" />
                          </ToggleGroupItem>
                          <ToggleGroupItem value="layout" aria-label="Layout preview">
                            <Layout className="h-4 w-4" />
                          </ToggleGroupItem>
                        </ToggleGroup>
                        <Button variant="outline" size="sm" onClick={() => handleCopy(generatedContent)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDownload(generatedContent, lastGeneratedFilename || `content.${contentType === 'markdown' ? 'md' : contentType}`)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px] rounded-md border bg-muted/30">
                    {generatedContent ? (
                      generatePreviewMode === 'code' ? (
                        <pre className="text-sm whitespace-pre-wrap font-mono p-4">{generatedContent}</pre>
                      ) : (
                        <div className="p-4">
                          {contentType === 'html' ? (
                            <iframe
                              srcDoc={generatedContent}
                              className="w-full h-[560px] bg-white rounded border"
                              title="HTML Preview"
                              sandbox="allow-same-origin"
                            />
                          ) : contentType === 'markdown' ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown>{generatedContent}</ReactMarkdown>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20">
                              <FileJson className="h-12 w-12 mb-2 opacity-50" />
                              <p>Layout preview not available for JSON</p>
                            </div>
                          )}
                        </div>
                      )
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <FileText className="h-12 w-12 mb-2 opacity-50" />
                        <p>No content generated yet</p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Generated Content
                </CardTitle>
                <CardDescription>
                  All generated content files stored in /content folder
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : contentList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mb-2 opacity-50" />
                    <p>No content generated yet</p>
                  </div>
                ) : (
                  <div className="grid lg:grid-cols-2 gap-4">
                    {/* Content List */}
                    <ScrollArea className="h-[500px] rounded-md border">
                      <div className="p-2 space-y-2">
                        {contentList.map((item) => (
                          <div
                            key={item.path}
                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedContent === item.name ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                            }`}
                            onClick={() => handleViewContent(item)}
                          >
                            <div className="flex items-center gap-3">
                              {getTypeIcon(item.type)}
                              <div>
                                <p className="font-medium text-sm">{item.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatSize(item.size)} • {new Date(item.modifiedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className={getTypeColor(item.type)}>
                                {item.type}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); handleDeleteContent(item); }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    {/* Content Preview */}
                    <div className="rounded-md border bg-muted/30">
                      <div className="flex items-center justify-between p-3 border-b">
                        <span className="text-sm font-medium">{selectedContent || 'Preview'}</span>
                        {previewContent && (
                          <div className="flex items-center gap-1">
                            {/* Preview Mode Toggle */}
                            <ToggleGroup type="single" value={contentPreviewMode} onValueChange={(v) => v && setContentPreviewMode(v as 'code' | 'layout')} size="sm">
                              <ToggleGroupItem value="code" aria-label="Code preview">
                                <Code className="h-3 w-3" />
                              </ToggleGroupItem>
                              <ToggleGroupItem value="layout" aria-label="Layout preview">
                                <Layout className="h-3 w-3" />
                              </ToggleGroupItem>
                            </ToggleGroup>
                            <Button variant="ghost" size="sm" onClick={() => handleCopy(previewContent)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDownload(previewContent, selectedContent || 'content')}>
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <ScrollArea className="h-[440px]">
                        {previewContent ? (
                          contentPreviewMode === 'code' ? (
                            <pre className="text-sm whitespace-pre-wrap font-mono p-4">{previewContent}</pre>
                          ) : (
                            <div className="p-4">
                              {selectedContentType === 'html' ? (
                                <iframe
                                  srcDoc={previewContent}
                                  className="w-full h-[400px] bg-white rounded border"
                                  title="HTML Preview"
                                  sandbox="allow-same-origin"
                                />
                              ) : selectedContentType === 'markdown' ? (
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                  <ReactMarkdown>{previewContent}</ReactMarkdown>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20">
                                  <FileJson className="h-12 w-12 mb-2 opacity-50" />
                                  <p>Layout preview not available for JSON</p>
                                </div>
                              )}
                            </div>
                          )
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <Eye className="h-12 w-12 mb-2 opacity-50" />
                            <p>Select a file to preview</p>
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <div className="grid md:grid-cols-3 gap-4">
              {(['html', 'json', 'markdown'] as ContentType[]).map((type) => (
                <Card key={type}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {getTypeIcon(type)}
                      {type.toUpperCase()}
                    </CardTitle>
                    <CardDescription>
                      {templates[type]?.length || 0} templates available
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {templates[type]?.map((t) => (
                        <div
                          key={t}
                          className="flex items-center justify-between p-2 rounded border hover:bg-muted cursor-pointer"
                        >
                          <span className="text-sm">{t}</span>
                          <Badge variant="outline">{type}</Badge>
                        </div>
                      ))}
                      {(!templates[type] || templates[type].length === 0) && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No templates available
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Template Info */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Template Structure</CardTitle>
                <CardDescription>
                  Templates define the structure for generated content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <h4 className="font-semibold mb-2">HTML Templates</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• <code>article</code> - Blog/article layout</li>
                      <li>• <code>landing</code> - Landing page sections</li>
                      <li>• <code>card</code> - Card component</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">JSON Templates</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• <code>article</code> - Article data structure</li>
                      <li>• <code>product</code> - E-commerce product</li>
                      <li>• <code>list</code> - List/collection data</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Markdown Templates</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• <code>article</code> - Standard article</li>
                      <li>• <code>documentation</code> - Technical docs</li>
                      <li>• <code>blog-post</code> - Blog post format</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attachments Tab */}
          <TabsContent value="attachments">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Attachments
                </CardTitle>
                <CardDescription>
                  Upload and manage files for use in your content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upload Area */}
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <input
                    type="file"
                    id="file-upload-attachments"
                    className="hidden"
                    accept="image/*,video/*,.pdf,.doc,.docx"
                    onChange={(e) => handleFileUpload(e, false)}
                  />
                  <label
                    htmlFor="file-upload-attachments"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="font-medium">Click to upload</p>
                    <p className="text-sm text-muted-foreground">Images, Videos, PDFs, Documents • Max 10MB</p>
                  </label>
                </div>

                <Separator />

                {/* Attachments List */}
                {attachments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Upload className="h-12 w-12 mb-2 opacity-50" />
                    <p>No attachments uploaded</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {attachments.map((item) => (
                      <div
                        key={item.path}
                        className="flex flex-col p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          {getAttachmentIcon(item)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{formatSize(item.size)}</p>
                          </div>
                        </div>
                        
                        {/* Preview for images */}
                        {isImage(item.name) && (
                          <div className="mb-2 rounded overflow-hidden bg-muted">
                            <img 
                              src={item.path} 
                              alt={item.name}
                              className="w-full h-24 object-cover"
                            />
                          </div>
                        )}
                        
                        {/* Linked Content Badge */}
                        {item.linkedContent && item.linkedContent.length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-1">
                            {item.linkedContent.map((content) => (
                              <Badge key={content} variant="outline" className="text-xs">
                                <Check className="h-3 w-3 mr-1" />
                                {content}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex gap-1 mt-auto">
                          <Button variant="outline" size="sm" className="flex-1" asChild>
                            <a href={item.path} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </a>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleDeleteAttachment(item.name)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-auto">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>Content Studio - AI-powered content generation</p>
            <p>Content stored in: <code className="text-xs bg-muted px-2 py-1 rounded">/content/*</code></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
