'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronDown, ChevronUp, Check, Plus, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { LegalPrompt, PaginationInfo } from '@/lib/types'

interface PromptSearchProps {
  prompts: LegalPrompt[]
  selectedPrompts: LegalPrompt[]
  onPromptToggle: (prompt: LegalPrompt) => void
  pagination: PaginationInfo
  isLoading: boolean
  handleAddCustomPrompt: (customPrompt: Omit<LegalPrompt, 'id'>) => Promise<void>
  handleRemovePrompt: (promptId: number) => Promise<void>
  handlePageChange: (newPage: number) => void
}

export default function PromptSearch({
  prompts,
  selectedPrompts,
  onPromptToggle,
  pagination,
  isLoading,
  handleAddCustomPrompt,
  handleRemovePrompt,
  handlePageChange
}: PromptSearchProps) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [previewPrompt, setPreviewPrompt] = React.useState<LegalPrompt | null>(null)
  const [activeTab, setActiveTab] = React.useState<string>('search')
  const [customPrompt, setCustomPrompt] = React.useState<Omit<LegalPrompt, 'id'>>({ name: '', prompt: '', category: '', createdAt: new Date() })
  const [isDialogOpen, setIsDialogOpen] = React.useState<boolean>(false)
  const [promptToRemove, setPromptToRemove] = React.useState<LegalPrompt | null>(null)
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all')

  const categories = React.useMemo(() => {
    const categorySet = new Set(prompts.map(prompt => prompt.category))
    return ['all', ...Array.from(categorySet)].sort()
  }, [prompts])

  const filteredPrompts = React.useMemo(() => {
    if (!searchQuery && categoryFilter === 'all') return prompts
    return prompts.filter(prompt => 
      (searchQuery === '' || prompt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       prompt.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
       prompt.prompt.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (categoryFilter === 'all' || prompt.category === categoryFilter)
    )
  }, [prompts, searchQuery, categoryFilter])

  const groupedPrompts = React.useMemo(() => {
    return categories.reduce((acc, category) => {
      if (category !== 'all') {
        acc[category] = filteredPrompts.filter(prompt => prompt.category === category)
      }
      return acc
    }, {} as Record<string, LegalPrompt[]>)
  }, [categories, filteredPrompts])

  const highlightText = (text: string, query: string) => {
    if (!query) return text
    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={index} className="bg-yellow-200 dark:bg-yellow-800">{part}</mark>
        : part
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="search">Search Prompts</TabsTrigger>
          <TabsTrigger value="custom">Add Custom Prompt</TabsTrigger>
        </TabsList>
        <div className="flex-grow overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === "search" && (
              <motion.div
                key="search"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-full"
              >
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search prompts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="mb-4">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category === 'all' ? 'All Categories' : category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <ScrollArea className="flex-grow">
                  <Accordion type="multiple" className="w-full">
                    {Object.entries(groupedPrompts).map(([category, prompts]) => (
                      <AccordionItem value={category} key={category}>
                        <AccordionTrigger className="text-sm font-medium">
                          {category} ({prompts.length})
                        </AccordionTrigger>
                        <AccordionContent>
                          <AnimatePresence>
                            {prompts.map(prompt => (
                              <motion.div
                                key={prompt.id}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                              >
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Card
                                        className={`mb-2 cursor-pointer transition-all ${
                                          selectedPrompts.some(p => p.id === prompt.id)
                                            ? 'border-primary bg-primary/10'
                                            : 'hover:border-primary/50 hover:bg-accent'
                                        }`}
                                        onClick={() => onPromptToggle(prompt)}
                                      >
                                        <CardContent className="p-3 flex items-center justify-between">
                                          <div>
                                            <p className="font-medium">
                                              {highlightText(prompt.name, searchQuery)}
                                            </p>
                                            <p className="text-sm text-muted-foreground truncate">
                                              {highlightText(prompt.prompt.substring(0, 50), searchQuery)}...
                                            </p>
                                          </div>
                                          {selectedPrompts.some(p => p.id === prompt.id) && (
                                            <Check className="h-4 w-4 text-primary" />
                                          )}
                                        </CardContent>
                                      </Card>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" align="start">
                                      <p className="max-w-xs">{prompt.prompt.substring(0, 100)}...</p>
                                      <Button 
                                        variant="link" 
                                        size="sm" 
                                        className="mt-2 p-0 h-auto"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setPreviewPrompt(prompt)
                                        }}
                                      >
                                        View full prompt
                                      </Button>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </ScrollArea>
                <div className="flex items-center justify-between mt-4">
                  <Button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    size="sm"
                    variant="outline"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  <span className="text-sm">Page {pagination.page} of {pagination.totalPages}</span>
                  <Button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    size="sm"
                    variant="outline"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}
            {activeTab === "custom" && (
              <motion.div
                key="custom"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-full"
              >
                <ScrollArea className="flex-grow">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="custom-prompt-name">Prompt Name</Label>
                      <Input
                        id="custom-prompt-name"
                        value={customPrompt.name}
                        onChange={(e) => setCustomPrompt(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter a name for your custom prompt"
                        aria-required="true"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="custom-prompt-category">Category</Label>
                      <Input
                        id="custom-prompt-category"
                        value={customPrompt.category}
                        onChange={(e) => setCustomPrompt(prev => ({ ...prev, category: e.target.value }))}
                        placeholder="Enter a category for your custom prompt"
                        aria-required="true"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="custom-prompt-content">Prompt Content</Label>
                      <Textarea
                        id="custom-prompt-content"
                        value={customPrompt.prompt}
                        onChange={(e) => setCustomPrompt(prev => ({ ...prev, prompt: e.target.value }))}
                        placeholder="Enter your custom legal prompt here..."
                        className="min-h-[150px]"
                        aria-required="true"
                      />
                    </div>
                  </div>
                </ScrollArea>
                <Button 
                  onClick={() => handleAddCustomPrompt(customPrompt)} 
                  disabled={customPrompt.name.trim() === '' || customPrompt.prompt.trim() === '' || customPrompt.category.trim() === '' || isLoading}
                  className="w-full mt-4"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding Prompt...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                      Add Custom Prompt
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Tabs>
      <div className="mt-4 space-y-4">
        <div>
          <Label className="text-sm font-semibold">Selected Prompts ({selectedPrompts.length})</Label>
          <ScrollArea className="h-[80px] rounded-md border p-2 mt-2 bg-accent/50">
            <div className="flex flex-wrap gap-2">
              {selectedPrompts.map((prompt) => (
                <Badge key={prompt.id} variant="secondary" className="px-2 py-1 flex items-center space-x-1 bg-background">
                  <span className="truncate max-w-[100px]">{prompt.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 hover:bg-destructive/20 rounded-full"
                    aria-label={`Remove ${prompt.name} prompt`}
                    onClick={() => {
                      setPromptToRemove(prompt)
                      setIsDialogOpen(true)
                    }}
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </Button>
                </Badge>
              ))}
              {selectedPrompts.length === 0 && (
                <p className="text-sm text-muted-foreground italic">No prompts selected</p>
              )}
            </div>
          </ScrollArea>
        </div>
        <Button 
          className="w-full"
          disabled={selectedPrompts.length === 0}
          aria-label={`Use ${selectedPrompts.length} Selected Prompt${selectedPrompts.length !== 1 ? 's' : ''}`}
        >
          Use Selected Prompts ({selectedPrompts.length})
        </Button>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Prompt</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove the &quot;{promptToRemove?.name}&quot; prompt?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} autoFocus>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (promptToRemove) {
                  handleRemovePrompt(promptToRemove.id)
                  setIsDialogOpen(false)
                }
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!previewPrompt} onOpenChange={() => setPreviewPrompt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{previewPrompt?.name}</DialogTitle>
            <DialogDescription>Category: {previewPrompt?.category}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="mt-4 h-[300px] rounded-md border p-4">
            <p className="text-sm">{previewPrompt?.prompt}</p>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}