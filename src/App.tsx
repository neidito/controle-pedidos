import { useState, useEffect, useMemo, Component, useRef, useCallback } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import {
  Package, Clock, Truck, AlertCircle, Plus, Trash2, Search, Calendar, FileX, Receipt,
  RefreshCw, Loader2, PackageOpen, LogOut, UserPlus, Shield, User,
  Eye, EyeOff, Lock, UserCog, CheckCircle2, XCircle, Sun, Moon, Database,
  Pencil, Copy, Upload, FileSpreadsheet, Download, Scale, Send,
  StickyNote, ListTodo, Flag, X, Check, LayoutDashboard, Palette, ArrowLeft,
  FileText, Building2, Users
} from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Error Boundary - com tratamento especial para erros de DOM (removeChild/insertBefore)
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    // Erros de DOM (removeChild/insertBefore) geralmente são causados por extensões do navegador
    // que modificam o DOM fora do controle do React. Tentamos recuperar automaticamente.
    const isDomError = error.message?.includes('removeChild') ||
      error.message?.includes('insertBefore') ||
      error.message?.includes('appendChild')
    if (isDomError) {
      console.warn('Erro de DOM detectado (provavelmente extensão do navegador). Recuperando...', error.message)
      return { hasError: false, error: null }
    }
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const isDomError = error.message?.includes('removeChild') ||
      error.message?.includes('insertBefore') ||
      error.message?.includes('appendChild')
    if (isDomError) {
      // Tenta recarregar silenciosamente em vez de crashar
      console.warn('Erro de DOM capturado, recarregando...', error.message)
      window.location.reload()
      return
    }
    console.error('App Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-lg w-full text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Erro no Aplicativo</h1>
            <p className="text-slate-600 mb-4">Ocorreu um erro ao carregar.</p>
            <pre className="bg-slate-100 p-4 rounded text-left text-xs overflow-auto max-h-32 mb-4">
              {this.state.error?.message || 'Erro desconhecido'}
            </pre>
            <button
              onClick={() => { localStorage.clear(); window.location.reload() }}
              className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600"
            >
              Recarregar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// Types
interface Usuario {
  id: string
  nome: string
  email: string
  senha: string
  tipo: 'admin' | 'colaborador'
  ativo: boolean
  criado_em: string
  criado_por?: string
}

interface Pedido {
  id: string
  periodo_id: string
  nr_pedido: string
  cliente: string
  medico: string
  vendedor: string
  data: string
  produto: string
  qtd: number
  total: number
  rastreio: string
  status: 'Em Separação' | 'Em Trânsito' | 'Anvisa' | 'Problema Anvisa' | 'Atraso' | 'Doc. Recusado' | 'THC / 2000'
  thc_status?: 'Pendente de Envio' | 'Enviado'
}

interface Periodo {
  id: string
  nome: string
  mes: number
  ano: number
}

interface Vendedor {
  id: string
  nome: string
  ativo: boolean
  criado_em: string
}

interface Judicializacao {
  id: string
  periodo_id: string
  nr_processo: string
  cliente: string
  advogado: string
  produto: string
  qtd: number
  total: number
  data: string
  status: 'Orçado' | 'Embarcado' | 'Entregue'
  observacoes: string
  criado_por: string
  criado_em: string
}

interface ControleEnvio {
  id: string
  periodo_id: string
  nome: string
  produto: string
  qtd: number
  data: string
  rastreio: string
  status: 'Pendente' | 'Enviado' | 'Em Trânsito' | 'Anvisa' | 'Problema'
  criado_por: string
  criado_em: string
}

interface PostIt {
  id: string
  usuario_id: string
  conteudo: string
  cor: string
  posicao_x: number
  posicao_y: number
  largura: number
  altura: number
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente'
  criado_em: string
}

interface Tarefa {
  id: string
  usuario_id: string
  lista_id: string
  texto: string
  concluida: boolean
  ordem: number
  criado_em: string
}

interface ListaTarefas {
  id: string
  usuario_id: string
  titulo: string
  cor: string
  posicao_x: number
  posicao_y: number
  criado_em: string
}

interface Cliente {
  id: string
  razao_social: string
  cnpj: string
  endereco: string
  cidade: string
  estado: string
  cep: string
  telefone: string
  email: string
  contato: string
  ativo: boolean
  criado_em: string
}

interface OrcamentoItem {
  id?: string
  orcamento_id?: string
  descricao: string
  qtd: number
  preco_unitario: number
  preco_total: number
}

interface Orcamento {
  id: string
  numero: string
  data: string
  cliente_id: string
  cliente_nome?: string
  empresa_nome: string
  empresa_endereco: string
  empresa_cidade: string
  empresa_telefone: string
  empresa_email: string
  observacoes: string
  valor_total: number
  status: 'Rascunho' | 'Enviado' | 'Aprovado' | 'Recusado'
  criado_por: string
  criado_em: string
  itens?: OrcamentoItem[]
}

const SESSION_KEY = 'controle-pedidos-session'

// Formata número para moeda brasileira (1.550,20)
const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Converte string formatada para número (1.550,20 -> 1550.20)
const parseCurrency = (value: string): number => {
  if (!value) return 0
  // Remove pontos de milhar e substitui vírgula por ponto
  const cleaned = value.replace(/\./g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

const SAO_PAULO_TZ = 'America/Sao_Paulo'

// Retorna a data de hoje no fuso horário de São Paulo (YYYY-MM-DD)
const getTodayInSaoPaulo = (): string => {
  return new Date().toLocaleDateString('en-CA', { timeZone: SAO_PAULO_TZ })
}

// Formata uma data (YYYY-MM-DD) para exibição em pt-BR com fuso de São Paulo
const formatDateBR = (dateStr: string): string => {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('pt-BR', { timeZone: SAO_PAULO_TZ })
}

// Componente de Input que só salva no blur (ao sair do campo)
function EditableInput({ 
  value, 
  onSave, 
  type = 'text',
  className = '',
  placeholder = ''
}: { 
  value: string | number
  onSave: (value: string | number) => void
  type?: 'text' | 'number' | 'date'
  className?: string
  placeholder?: string
}) {
  const [localValue, setLocalValue] = useState(String(value))
  
  // Atualiza valor local quando o valor externo muda (ex: sync de outro usuário)
  useEffect(() => {
    setLocalValue(String(value))
  }, [value])
  
  const handleBlur = () => {
    if (localValue !== String(value)) {
      if (type === 'number') {
        onSave(parseFloat(localValue) || 0)
      } else {
        onSave(localValue)
      }
    }
  }
  
  return (
    <Input
      type={type}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      className={className}
      placeholder={placeholder}
    />
  )
}

// Componente de Input de moeda que só salva no blur
function CurrencyInput({ 
  value, 
  onSave, 
  className = ''
}: { 
  value: number
  onSave: (value: number) => void
  className?: string
}) {
  const [localValue, setLocalValue] = useState(formatCurrency(value))
  
  useEffect(() => {
    setLocalValue(formatCurrency(value))
  }, [value])
  
  const handleBlur = () => {
    const numValue = parseCurrency(localValue)
    if (numValue !== value) {
      onSave(numValue)
    }
    setLocalValue(formatCurrency(numValue))
  }
  
  return (
    <Input
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value.replace(/[^\d.,]/g, ''))}
      onBlur={handleBlur}
      className={className}
      placeholder="0,00"
    />
  )
}

// Componente de Textarea para produtos (múltiplas linhas)
function EditableTextarea({ 
  value, 
  onSave, 
  className = '',
  placeholder = ''
}: { 
  value: string
  onSave: (value: string) => void
  className?: string
  placeholder?: string
}) {
  const [localValue, setLocalValue] = useState(value)
  const [isEditing, setIsEditing] = useState(false)
  
  useEffect(() => {
    setLocalValue(value)
  }, [value])
  
  const handleBlur = () => {
    setIsEditing(false)
    if (localValue !== value) {
      onSave(localValue)
    }
  }
  
  const lines = localValue ? localValue.split('\n').filter(l => l.trim()) : []
  
  if (isEditing) {
    return (
      <textarea
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        className={`${className} w-full min-h-[80px] resize-none rounded-md border border-orange-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400`}
        placeholder={placeholder}
        autoFocus
        rows={Math.max(3, lines.length + 1)}
      />
    )
  }
  
  return (
    <div 
      onClick={() => setIsEditing(true)}
      className={`${className} cursor-pointer min-h-[32px] rounded-md border border-transparent hover:border-slate-300 hover:bg-slate-50 px-2 py-1`}
      title="Clique para editar"
    >
      {lines.length > 0 ? (
        <div className="flex flex-col">
          {lines.map((line, i) => (
            <div key={i} className="text-sm py-0.5 border-b border-slate-100 last:border-0">{line.trim()}</div>
          ))}
        </div>
      ) : (
        <span className="text-slate-400 text-sm">{placeholder}</span>
      )}
    </div>
  )
}

// Componente de autocomplete para vendedores
function VendedorAutocomplete({ 
  value, 
  onSelect, 
  vendedores,
  className = ''
}: { 
  value: string
  onSelect: (value: string) => void
  vendedores: { id: string; nome: string; ativo: boolean }[]
  className?: string
}) {
  const [search, setSearch] = useState(value)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    setSearch(value)
  }, [value])
  
  const filteredVendedores = vendedores
    .filter(v => v.ativo && v.nome.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 10) // Limita a 10 resultados
  
  const handleSelect = (nome: string) => {
    setSearch(nome)
    onSelect(nome)
    setIsOpen(false)
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex(i => Math.min(i + 1, filteredVendedores.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filteredVendedores.length > 0) {
      e.preventDefault()
      handleSelect(filteredVendedores[highlightIndex].nome)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }
  
  const handleBlur = () => {
    // Delay para permitir clique na lista
    setTimeout(() => {
      setIsOpen(false)
      // Se o texto digitado não corresponde a nenhum vendedor, limpa
      const match = vendedores.find(v => v.ativo && v.nome.toLowerCase() === search.toLowerCase())
      if (match) {
        onSelect(match.nome)
      } else if (search && !match) {
        // Mantém o que foi digitado se parcialmente corresponde
        const partial = vendedores.find(v => v.ativo && v.nome.toLowerCase().includes(search.toLowerCase()))
        if (partial) {
          setSearch(partial.nome)
          onSelect(partial.nome)
        }
      }
    }, 200)
  }
  
  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setIsOpen(true)
          setHighlightIndex(0)
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={className}
        placeholder="Digite para buscar..."
      />
      {isOpen && search && filteredVendedores.length > 0 && (
        <div 
          ref={listRef}
          className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto"
        >
          {filteredVendedores.map((v, i) => (
            <div
              key={v.id}
              className={`px-3 py-2 cursor-pointer text-sm ${i === highlightIndex ? 'bg-orange-100 text-orange-900' : 'hover:bg-slate-50'}`}
              onMouseDown={() => handleSelect(v.nome)}
              onMouseEnter={() => setHighlightIndex(i)}
            >
              {v.nome}
            </div>
          ))}
        </div>
      )}
      {isOpen && search && filteredVendedores.length === 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg">
          <div className="px-3 py-2 text-sm text-slate-500">Nenhum vendedor encontrado</div>
        </div>
      )}
    </div>
  )
}

// Componente de Textarea para Post-its (salva no blur)
function PostItTextarea({ 
  value, 
  onSave, 
  placeholder = ''
}: { 
  value: string
  onSave: (value: string) => void
  placeholder?: string
}) {
  const [localValue, setLocalValue] = useState(value)
  
  useEffect(() => {
    setLocalValue(value)
  }, [value])
  
  const handleBlur = () => {
    if (localValue !== value) {
      onSave(localValue)
    }
  }
  
  return (
    <textarea
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      placeholder={placeholder}
      className="w-full min-h-[100px] bg-transparent border-0 resize-none focus:outline-none text-sm"
      style={{ backgroundColor: 'transparent' }}
    />
  )
}

// Componente de Input que salva no blur (para títulos e tarefas)
function BlurInput({ 
  value, 
  onSave, 
  className = '',
  placeholder = ''
}: { 
  value: string
  onSave: (value: string) => void
  className?: string
  placeholder?: string
}) {
  const [localValue, setLocalValue] = useState(value)
  
  useEffect(() => {
    setLocalValue(value)
  }, [value])
  
  const handleBlur = () => {
    if (localValue !== value) {
      onSave(localValue)
    }
  }
  
  return (
    <input
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      className={className}
      placeholder={placeholder}
    />
  )
}

const getCurrentPeriodo = () => {
  const today = getTodayInSaoPaulo()
  const [year, month] = today.split('-').map(Number)
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  return { nome: `${meses[month - 1]} ${year}`, mes: month, ano: year }
}

const statusConfig: Record<string, { color: string; icon: any; cardClass: string; iconBgClass: string; textClass: string }> = {
  'Em Separação': { color: 'status-separacao border', icon: Package, cardClass: 'card-separacao', iconBgClass: 'icon-bg-separacao', textClass: 'text-separacao' },
  'Em Trânsito': { color: 'status-transito border', icon: Truck, cardClass: 'card-transito', iconBgClass: 'icon-bg-transito', textClass: 'text-transito' },
  'Anvisa': { color: 'status-anvisa border', icon: Clock, cardClass: 'card-anvisa', iconBgClass: 'icon-bg-anvisa', textClass: 'text-anvisa' },
  'Problema Anvisa': { color: 'status-problema border', icon: AlertCircle, cardClass: 'card-problema', iconBgClass: 'icon-bg-problema', textClass: 'text-problema' },
  'Atraso': { color: 'status-atraso border', icon: AlertCircle, cardClass: 'card-atraso', iconBgClass: 'icon-bg-atraso', textClass: 'text-atraso' },
  'Doc. Recusado': { color: 'status-doc-recusado border', icon: FileX, cardClass: 'card-doc-recusado', iconBgClass: 'icon-bg-doc-recusado', textClass: 'text-doc-recusado' },
  'THC / 2000': { color: 'status-thc border', icon: Receipt, cardClass: 'card-thc', iconBgClass: 'icon-bg-thc', textClass: 'text-thc' }
}

const statusJudicConfig: Record<string, { color: string; bgColor: string }> = {
  'Orçado': { color: 'text-amber-700', bgColor: 'bg-amber-100' },
  'Embarcado': { color: 'text-blue-700', bgColor: 'bg-blue-100' },
  'Entregue': { color: 'text-green-700', bgColor: 'bg-green-100' }
}

const statusEnvioConfig: Record<string, { color: string; bgColor: string }> = {
  'Pendente': { color: 'text-slate-700', bgColor: 'bg-slate-100' },
  'Enviado': { color: 'text-blue-700', bgColor: 'bg-blue-100' },
  'Em Trânsito': { color: 'text-purple-700', bgColor: 'bg-purple-100' },
  'Anvisa': { color: 'text-amber-700', bgColor: 'bg-amber-100' },
  'Problema': { color: 'text-red-700', bgColor: 'bg-red-100' }
}

const statusThcConfig: Record<string, { color: string; bgColor: string }> = {
  'Pendente de Envio': { color: 'text-amber-700', bgColor: 'bg-amber-100' },
  'Enviado': { color: 'text-green-700', bgColor: 'bg-green-100' }
}

// ==================== LOGIN SCREEN ====================
function LoginScreen({ onLogin }: { onLogin: (u: Usuario) => void }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = getSupabase()
      const { data, error: dbError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .eq('senha', senha)
        .eq('ativo', true)
        .single()

      if (dbError || !data) {
        setError('Email ou senha incorretos')
        setLoading(false)
        return
      }

      const usuario: Usuario = {
        id: data.id, nome: data.nome, email: data.email, senha: data.senha,
        tipo: data.tipo, ativo: data.ativo, criado_em: data.criado_em
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify(usuario))
      onLogin(usuario)
      toast.success(`Bem-vindo, ${usuario.nome}!`)
    } catch (err) {
      console.error(err)
      setError('Erro ao conectar. Tente novamente.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-orange-500 rounded-2xl shadow-xl mb-4">
            <PackageOpen className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Controle de Pedidos</h1>
          <p className="text-slate-600 dark:text-slate-400">Faça login para acessar</p>
        </div>

        <Card className="shadow-xl">
          <CardContent className="p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="text-sm font-medium block mb-1">Email</label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Senha</label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={senha} onChange={(e) => setSenha(e.target.value)} className="pl-10 pr-10" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}

              <Button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Entrar</span>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ==================== MAIN APP ====================
function App() {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [judicializacoes, setJudicializacoes] = useState<Judicializacao[]>([])
  const [controleEnvios, setControleEnvios] = useState<ControleEnvio[]>([])
  const [postIts, setPostIts] = useState<PostIt[]>([])
  const [listaTarefas, setListaTarefas] = useState<ListaTarefas[]>([])
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [periodoAtual, setPeriodoAtual] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [showNovoPeriodo, setShowNovoPeriodo] = useState(false)
  const [novoPeriodoNome, setNovoPeriodoNome] = useState('')
  const [activeTab, setActiveTab] = useState('workspace')
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark')
  const [pedidosPeriodoSelecionado, setPedidosPeriodoSelecionado] = useState(false)
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUser, setNewUser] = useState({ nome: '', email: '', senha: '', tipo: 'colaborador' as const })
  const [showAddVendedor, setShowAddVendedor] = useState(false)
  const [newVendedor, setNewVendedor] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [importData, setImportData] = useState<any[]>([])
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)

  // Estados para importação de vendedores
  const [showImportVendedoresModal, setShowImportVendedoresModal] = useState(false)
  const [importVendedoresData, setImportVendedoresData] = useState<{ nome: string }[]>([])
  const [importVendedoresErrors, setImportVendedoresErrors] = useState<string[]>([])
  const [importingVendedores, setImportingVendedores] = useState(false)

  // Estados para Judicializações
  const [showAddJudic, setShowAddJudic] = useState(false)
  const [newJudic, setNewJudic] = useState({
    nr_processo: '', cliente: '', advogado: '', produto: '',
    qtd: 1, total: 0, data: getTodayInSaoPaulo(),
    status: 'Orçado' as const, observacoes: ''
  })
  
  // Estados para Controle de Envios
  const [showAddEnvio, setShowAddEnvio] = useState(false)
  const [newEnvio, setNewEnvio] = useState({
    nome: '', produto: '', qtd: 1,
    data: getTodayInSaoPaulo(),
    rastreio: '', status: 'Pendente' as const
  })
  
  const [reservingPedido, setReservingPedido] = useState(false)
  const [newRow, setNewRow] = useState({
    nr_pedido: '', cliente: '', medico: '', vendedor: '',
    data: getTodayInSaoPaulo(), produto: '',
    qtd: 1, total: 0, rastreio: '', status: 'Em Separação' as const
  })

  // Estados para edição de Controle de Envios
  const [showEditEnvio, setShowEditEnvio] = useState(false)
  const [editingEnvio, setEditingEnvio] = useState<ControleEnvio | null>(null)

  // Estados para THC-2000
  const [thcPedidos, setThcPedidos] = useState<Pedido[]>([])
  const [thcSearchTerm, setThcSearchTerm] = useState('')
  const [thcFilterStatus, setThcFilterStatus] = useState('Todos')

  // Estados para edição de Judicializações
  const [showEditJudic, setShowEditJudic] = useState(false)
  const [editingJudic, setEditingJudic] = useState<Judicializacao | null>(null)

  // Estados para edição de Vendedores
  const [showEditVendedor, setShowEditVendedor] = useState(false)
  const [editingVendedor, setEditingVendedor] = useState<Vendedor | null>(null)

  // Estados para edição de Usuários
  const [showEditUser, setShowEditUser] = useState(false)
  const [editingUser, setEditingUser] = useState<Usuario | null>(null)
  const [editUserData, setEditUserData] = useState({ email: '', senha: '' })

  // ID do pedido que está sendo editado (reservado) pelo usuário atual
  const [editingPedidoId, setEditingPedidoId] = useState<string | null>(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  // Estados para Gerador de Orçamento
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [showAddCliente, setShowAddCliente] = useState(false)
  const [showEditCliente, setShowEditCliente] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [newCliente, setNewCliente] = useState({
    razao_social: '', cnpj: '', endereco: '', cidade: '', estado: '', cep: '', telefone: '', email: '', contato: ''
  })
  const [orcamentoView, setOrcamentoView] = useState<'list' | 'new' | 'edit' | 'clientes'>('list')
  const [editingOrcamento, setEditingOrcamento] = useState<Orcamento | null>(null)
  const [orcamentoForm, setOrcamentoForm] = useState({
    numero: '',
    data: getTodayInSaoPaulo(),
    cliente_id: '',
    empresa_nome: 'Carmens Medicinals',
    empresa_endereco: '1241 Stirling rd UNIT 101',
    empresa_cidade: 'Dania Beach, Florida - USA, 33004',
    empresa_telefone: '',
    empresa_email: '',
    observacoes: '',
    itens: [{ descricao: '', qtd: 1, preco_unitario: 0, preco_total: 0 }] as OrcamentoItem[]
  })
  const [orcamentoSearchTerm, setOrcamentoSearchTerm] = useState('')
  const [clienteSearchTerm, setClienteSearchTerm] = useState('')
  const [logoBase64, setLogoBase64] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  
  // Copiar texto para clipboard
  const copyToClipboard = (text: string) => {
    if (!text || text === 'Código') return
    navigator.clipboard.writeText(text)
    toast.success('Código copiado!')
  }

  const isAdmin = currentUser?.tipo === 'admin'

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  // Check session on load
  useEffect(() => {
    const session = localStorage.getItem(SESSION_KEY)
    if (session) {
      try {
        setCurrentUser(JSON.parse(session))
      } catch { localStorage.removeItem(SESSION_KEY) }
    }
    setLoading(false)
  }, [])

  // Load data when logged in
  useEffect(() => {
    if (!currentUser) return

    const loadData = async () => {
      const supabase = getSupabase()

      // Load usuarios
      const { data: usersData } = await supabase.from('usuarios').select('*').order('nome')
      if (usersData) setUsuarios(usersData)

      // Load vendedores
      const { data: vendedoresData } = await supabase.from('vendedores').select('*').eq('ativo', true).order('nome')
      if (vendedoresData) setVendedores(vendedoresData)

      // Load área de trabalho do usuário
      const { data: postItsData } = await supabase.from('postits').select('*').eq('usuario_id', currentUser.id).order('criado_em', { ascending: false })
      if (postItsData) setPostIts(postItsData)

      const { data: listasData } = await supabase.from('lista_tarefas').select('*').eq('usuario_id', currentUser.id).order('criado_em', { ascending: false })
      if (listasData) setListaTarefas(listasData)

      const { data: tarefasData } = await supabase.from('tarefas').select('*').eq('usuario_id', currentUser.id).order('ordem')
      if (tarefasData) setTarefas(tarefasData)

      // Load periodos
      const { data: periodosData } = await supabase.from('periodos').select('*').order('ano', { ascending: false }).order('mes', { ascending: false })
      
      if (periodosData && periodosData.length > 0) {
        setPeriodos(periodosData)
        setPeriodoAtual(periodosData[0].id)

        // Don't auto-load pedidos - user will select a period from cards in the Pedidos tab
        // Only load judicializações and envios for the default period
        const { data: judicData } = await supabase.from('judicializacoes').select('*').eq('periodo_id', periodosData[0].id).order('criado_em', { ascending: false })
        if (judicData) setJudicializacoes(judicData)

        const { data: enviosData } = await supabase.from('controle_envios').select('*').eq('periodo_id', periodosData[0].id).order('criado_em', { ascending: false })
        if (enviosData) setControleEnvios(enviosData)

        // Load THC / 2000 pedidos (all periods)
        const { data: thcData } = await supabase.from('pedidos').select('*').eq('status', 'THC / 2000').order('criado_em', { ascending: false })
        if (thcData) setThcPedidos(thcData)
      }

      // Load clientes e orcamentos (budget generator)
      const { data: clientesData } = await supabase.from('clientes').select('*').order('razao_social')
      if (clientesData) setClientes(clientesData)

      const { data: orcamentosData } = await supabase.from('orcamentos').select('*').order('criado_em', { ascending: false })
      if (orcamentosData) setOrcamentos(orcamentosData)

      // Load logo from localStorage
      const savedLogo = localStorage.getItem('orcamento-logo')
      if (savedLogo) setLogoBase64(savedLogo)

      if (!(periodosData && periodosData.length > 0)) {
        // Create default period
        const current = getCurrentPeriodo()
        const { data: newPeriodo } = await supabase.from('periodos').insert({ nome: current.nome, mes: current.mes, ano: current.ano }).select().single()
        if (newPeriodo) {
          setPeriodos([newPeriodo])
          setPeriodoAtual(newPeriodo.id)
        }
      }
    }

    loadData()
  }, [currentUser])

  // Realtime subscription consolidada para pedidos (evita updates simultâneos que causam removeChild)
  useEffect(() => {
    if (!currentUser) return

    const supabase = getSupabase()
    const channel = supabase
      .channel('pedidos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, async () => {
        setSyncing(true)
        try {
          if (periodoAtual && pedidosPeriodoSelecionado) {
            await loadPedidos()
          }
          await loadThcPedidos()
        } finally {
          setSyncing(false)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentUser, periodoAtual, pedidosPeriodoSelecionado])

  const loadPedidos = async () => {
    if (!periodoAtual) return
    const supabase = getSupabase()
    const { data } = await supabase.from('pedidos').select('*').eq('periodo_id', periodoAtual).order('criado_em', { ascending: false })
    if (data) setPedidos(data)
  }

  const loadThcPedidos = async () => {
    const supabase = getSupabase()
    const { data } = await supabase.from('pedidos').select('*').eq('status', 'THC / 2000').order('criado_em', { ascending: false })
    if (data) setThcPedidos(data)
  }

  const updateThcPedido = async (id: string, field: string, value: any) => {
    const supabase = getSupabase()
    await supabase.from('pedidos').update({ [field]: value }).eq('id', id)
    setThcPedidos(thcPedidos.map(p => p.id === id ? { ...p, [field]: value } : p))
    // Also update in main pedidos list if loaded
    setPedidos(pedidos.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const handlePeriodoChange = async (id: string) => {
    setPeriodoAtual(id)
    // Reset pedidos period selection - user will need to re-select via cards
    setPedidosPeriodoSelecionado(false)
    setPedidos([])
    const supabase = getSupabase()

    const { data: judicData } = await supabase.from('judicializacoes').select('*').eq('periodo_id', id).order('criado_em', { ascending: false })
    if (judicData) setJudicializacoes(judicData)

    const { data: enviosData } = await supabase.from('controle_envios').select('*').eq('periodo_id', id).order('criado_em', { ascending: false })
    if (enviosData) setControleEnvios(enviosData)
  }

  const handlePedidosPeriodoSelect = async (id: string) => {
    setPeriodoAtual(id)
    const supabase = getSupabase()

    const { data: pedidosData } = await supabase.from('pedidos').select('*').eq('periodo_id', id).order('criado_em', { ascending: false })
    if (pedidosData) setPedidos(pedidosData)

    // Also load judic and envios for the selected period to keep other tabs in sync
    const { data: judicData } = await supabase.from('judicializacoes').select('*').eq('periodo_id', id).order('criado_em', { ascending: false })
    if (judicData) setJudicializacoes(judicData)

    const { data: enviosData } = await supabase.from('controle_envios').select('*').eq('periodo_id', id).order('criado_em', { ascending: false })
    if (enviosData) setControleEnvios(enviosData)

    setPedidosPeriodoSelecionado(true)
  }

  const addPeriodo = async () => {
    if (!novoPeriodoNome.trim()) return
    const supabase = getSupabase()
    const currentPeriodo = getCurrentPeriodo()
    const { data, error } = await supabase.from('periodos').insert({ nome: novoPeriodoNome, mes: currentPeriodo.mes, ano: currentPeriodo.ano }).select().single()
    if (error) { toast.error('Erro ao criar período'); return }
    if (data) {
      setPeriodos([data, ...periodos])
      setPeriodoAtual(data.id)
      setPedidos([])
    }
    setNovoPeriodoNome('')
    setShowNovoPeriodo(false)
    toast.success('Período criado!')
  }

  // Reservar pedido (cria com apenas o número, visível para todos)
  const reservePedido = async () => {
    const nrPedido = newRow.nr_pedido.trim().toUpperCase()
    if (!nrPedido) { 
      toast.error('Digite o número do pedido para reservar'); 
      return 
    }

    setReservingPedido(true)

    try {
      const supabase = getSupabase()
      
      // Verificar no BANCO DE DADOS se já existe pedido com este número no período atual
      const { data: existente } = await supabase
        .from('pedidos')
        .select('id, nr_pedido')
        .eq('periodo_id', periodoAtual)
        .ilike('nr_pedido', nrPedido)
        .maybeSingle()

      if (existente) {
        toast.error(`Pedido ${nrPedido} já existe neste período!`)
        setReservingPedido(false)
        return
      }

      // Criar o pedido
      const pedido = {
        periodo_id: periodoAtual,
        nr_pedido: nrPedido,
        cliente: '', medico: '', vendedor: '',
        data: getTodayInSaoPaulo(),
        produto: '', qtd: 1, total: 0,
        rastreio: '', status: 'Em Separação',
        criado_por: currentUser?.id
      }

      const { data, error } = await supabase.from('pedidos').insert(pedido).select().single()
      
      if (error) { 
        // Se der erro de duplicidade (outro usuário inseriu no mesmo momento)
        if (error.code === '23505') {
          toast.error(`Pedido ${nrPedido} já foi reservado por outro usuário!`)
        } else {
          toast.error('Erro ao reservar pedido')
          console.error(error)
        }
        setReservingPedido(false)
        return 
      }
      
      if (data) {
        setPedidos([data, ...pedidos])
        setEditingPedidoId(data.id)
        setNewRow({ ...newRow, nr_pedido: '' })
        toast.success(`Pedido ${nrPedido} reservado! Complete os dados.`)
      }
    } catch (err) {
      toast.error('Erro ao reservar pedido')
      console.error(err)
    }

    setReservingPedido(false)
  }

  // Finalizar edição do pedido
  const finishEditingPedido = () => {
    const pedido = pedidos.find(p => p.id === editingPedidoId)
    if (pedido && (!pedido.cliente || !pedido.produto)) {
      toast.error('Preencha pelo menos Cliente e Produto')
      return
    }
    setEditingPedidoId(null)
    toast.success('Pedido salvo!')
  }
  
  // Iniciar edição de um pedido existente
  const startEditingPedido = (id: string) => {
    if (editingPedidoId && editingPedidoId !== id) {
      toast.error('Finalize a edição do pedido atual primeiro')
      return
    }
    setEditingPedidoId(id)
  }

  const updatePedido = async (id: string, field: string, value: any) => {
    // Colaboradores podem editar: status, rastreio, ou campos de pedidos que estão editando
    const isEditingThisPedido = editingPedidoId === id
    const canEdit = isAdmin || isEditingThisPedido || ['status', 'rastreio'].includes(field)
    
    if (!canEdit) { 
      toast.error('Sem permissão para editar este campo'); 
      return 
    }
    
    const supabase = getSupabase()
    await supabase.from('pedidos').update({ [field]: value }).eq('id', id)
    setPedidos(pedidos.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const deletePedido = async (id: string) => {
    if (!isAdmin) { toast.error('Apenas admins'); return }
    const supabase = getSupabase()
    await supabase.from('pedidos').delete().eq('id', id)
    setPedidos(pedidos.filter(p => p.id !== id))
    toast.success('Excluído')
  }

  const handleLogout = () => {
    setShowLogoutConfirm(false)
    localStorage.removeItem(SESSION_KEY)
    setCurrentUser(null)
  }

  const addUser = async () => {
    if (!newUser.nome || !newUser.email || !newUser.senha) { toast.error('Preencha todos os campos'); return }
    const supabase = getSupabase()
    const { error } = await supabase.from('usuarios').insert({ ...newUser, ativo: true, criado_por: currentUser?.id })
    if (error) { toast.error('Erro ao criar usuário'); return }
    const { data } = await supabase.from('usuarios').select('*').order('nome')
    if (data) setUsuarios(data)
    setNewUser({ nome: '', email: '', senha: '', tipo: 'colaborador' })
    setShowAddUser(false)
    toast.success('Usuário criado!')
  }

  const toggleUser = async (id: string, ativo: boolean) => {
    if (id === currentUser?.id) { toast.error('Não pode desativar você mesmo'); return }
    const supabase = getSupabase()
    await supabase.from('usuarios').update({ ativo: !ativo }).eq('id', id)
    const { data } = await supabase.from('usuarios').select('*').order('nome')
    if (data) setUsuarios(data)
    toast.success('Atualizado')
  }

  // Funções de vendedores
  const loadVendedores = async () => {
    const supabase = getSupabase()
    const { data } = await supabase.from('vendedores').select('*').order('nome')
    if (data) setVendedores(data)
  }

  const addVendedor = async () => {
    if (!newVendedor.trim()) { toast.error('Digite o nome do vendedor'); return }
    const supabase = getSupabase()
    const { error } = await supabase.from('vendedores').insert({ nome: newVendedor.trim(), ativo: true })
    if (error) { 
      toast.error('Erro ao criar vendedor')
      console.error(error)
      return 
    }
    await loadVendedores()
    setNewVendedor('')
    setShowAddVendedor(false)
    toast.success('Vendedor cadastrado!')
  }

  const toggleVendedor = async (id: string, ativo: boolean) => {
    const supabase = getSupabase()
    await supabase.from('vendedores').update({ ativo: !ativo }).eq('id', id)
    await loadVendedores()
    toast.success('Atualizado')
  }

  const deleteVendedor = async (id: string) => {
    const supabase = getSupabase()
    await supabase.from('vendedores').delete().eq('id', id)
    await loadVendedores()
    toast.success('Vendedor excluído')
  }

  // Funções de importação de vendedores via CSV
  const handleVendedoresFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n').filter(line => line.trim())

      if (lines.length < 2) {
        setImportVendedoresErrors(['Arquivo vazio ou sem dados'])
        setImportVendedoresData([])
        return
      }

      // Detecta separador
      const separator = lines[0].includes(';') ? ';' : ','
      const headers = lines[0].split(separator).map(h => h.trim().toLowerCase().replace(/"/g, ''))

      // Verifica se tem coluna 'nome'
      const nomeIndex = headers.findIndex(h => h === 'nome')
      if (nomeIndex === -1) {
        setImportVendedoresErrors(['Coluna "nome" não encontrada no cabeçalho'])
        setImportVendedoresData([])
        return
      }

      const errors: string[] = []
      const validRows: { nome: string }[] = []
      const nomesVistos = new Set<string>()

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(separator).map(v => v.trim().replace(/"/g, ''))
        const nome = values[nomeIndex]?.trim()
        const lineNum = i + 1

        if (!nome) {
          errors.push(`Linha ${lineNum}: nome é obrigatório`)
          continue
        }

        // Verifica duplicatas no próprio arquivo
        const nomeUpper = nome.toUpperCase()
        if (nomesVistos.has(nomeUpper)) {
          errors.push(`Linha ${lineNum}: "${nome}" duplicado no arquivo`)
          continue
        }

        nomesVistos.add(nomeUpper)
        validRows.push({ nome })
      }

      setImportVendedoresData(validRows)
      setImportVendedoresErrors(errors)
    }

    reader.readAsText(file, 'UTF-8')
  }

  const executeVendedoresImport = async () => {
    if (importVendedoresData.length === 0) return

    setImportingVendedores(true)
    const supabase = getSupabase()

    let successCount = 0
    let errorCount = 0
    const newErrors: string[] = []

    for (const row of importVendedoresData) {
      // Verifica se já existe vendedor com este nome
      const { data: existing } = await supabase
        .from('vendedores')
        .select('id')
        .ilike('nome', row.nome)
        .maybeSingle()

      if (existing) {
        newErrors.push(`"${row.nome}" já existe - ignorado`)
        errorCount++
        continue
      }

      const { error } = await supabase.from('vendedores').insert({
        nome: row.nome,
        ativo: true
      })

      if (error) {
        newErrors.push(`Erro ao importar "${row.nome}": ${error.message}`)
        errorCount++
      } else {
        successCount++
      }
    }

    setImportingVendedores(false)
    setImportVendedoresErrors(newErrors)

    if (successCount > 0) {
      await loadVendedores()
      toast.success(`${successCount} vendedor(es) importado(s) com sucesso!`)
    }

    if (errorCount > 0) {
      toast.error(`${errorCount} vendedor(es) com erro`)
    }

    if (successCount > 0 && errorCount === 0) {
      setShowImportVendedoresModal(false)
      setImportVendedoresData([])
      setImportVendedoresErrors([])
    }
  }

  const downloadVendedoresTemplate = () => {
    const headers = 'nome'
    const examples = 'João Silva\nMaria Santos\nCarlos Oliveira'
    const csv = headers + '\n' + examples

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'modelo_importacao_vendedores.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Funções de importação
  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length < 2) return []
    
    // Detecta separador (vírgula ou ponto-e-vírgula)
    const separator = lines[0].includes(';') ? ';' : ','
    
    const headers = lines[0].split(separator).map(h => h.trim().toLowerCase().replace(/"/g, ''))
    const rows: any[] = []
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(separator).map(v => v.trim().replace(/"/g, ''))
      const row: any = {}
      headers.forEach((h, idx) => {
        row[h] = values[idx] || ''
      })
      rows.push(row)
    }
    
    return rows
  }

  const parseDate = (dateStr: string): string => {
    if (!dateStr) return getTodayInSaoPaulo()
    
    // Tenta DD/MM/YYYY
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/')
      if (parts.length === 3) {
        const [day, month, year] = parts
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
    }
    
    // Já está em YYYY-MM-DD
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr
    }
    
    return getTodayInSaoPaulo()
  }

  const parseNumber = (value: string): number => {
    if (!value) return 0
    // Remove pontos de milhar e troca vírgula por ponto
    const cleaned = value.replace(/\./g, '').replace(',', '.')
    return parseFloat(cleaned) || 0
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const rows = parseCSV(text)
      
      const errors: string[] = []
      const validRows: any[] = []
      
      rows.forEach((row, idx) => {
        const lineNum = idx + 2 // +2 porque linha 1 é cabeçalho
        
        // Validações
        if (!row.nr_pedido) {
          errors.push(`Linha ${lineNum}: nr_pedido é obrigatório`)
          return
        }
        if (!row.cliente) {
          errors.push(`Linha ${lineNum}: cliente é obrigatório`)
          return
        }
        if (!row.produto) {
          errors.push(`Linha ${lineNum}: produto é obrigatório`)
          return
        }
        
        // Verifica status válido
        const validStatus = ['Em Separação', 'Em Trânsito', 'Anvisa', 'Problema Anvisa', 'Atraso', 'Doc. Recusado', 'THC / 2000']
        const status = row.status && validStatus.includes(row.status) ? row.status : 'Em Separação'
        
        validRows.push({
          nr_pedido: row.nr_pedido.toUpperCase(),
          cliente: row.cliente,
          medico: row.medico || '',
          vendedor: row.vendedor || '',
          data: parseDate(row.data),
          produto: row.produto.replace(/\\n/g, '\n'), // Converte \n em quebra de linha
          qtd: parseInt(row.qtd) || 1,
          total: parseNumber(row.total),
          rastreio: row.rastreio || '',
          status: status
        })
      })
      
      setImportData(validRows)
      setImportErrors(errors)
    }
    
    reader.readAsText(file, 'UTF-8')
  }

  const executeImport = async () => {
    if (importData.length === 0) return
    
    setImporting(true)
    const supabase = getSupabase()
    
    let successCount = 0
    let errorCount = 0
    const newErrors: string[] = []
    
    for (const row of importData) {
      // Verifica se já existe
      const { data: existing } = await supabase
        .from('pedidos')
        .select('id')
        .eq('periodo_id', periodoAtual)
        .ilike('nr_pedido', row.nr_pedido)
        .maybeSingle()
      
      if (existing) {
        newErrors.push(`Pedido ${row.nr_pedido} já existe - ignorado`)
        errorCount++
        continue
      }
      
      const { error } = await supabase.from('pedidos').insert({
        periodo_id: periodoAtual,
        ...row,
        criado_por: currentUser?.id
      })
      
      if (error) {
        newErrors.push(`Erro ao importar ${row.nr_pedido}: ${error.message}`)
        errorCount++
      } else {
        successCount++
      }
    }
    
    setImporting(false)
    setImportErrors(newErrors)
    
    if (successCount > 0) {
      await loadPedidos()
      toast.success(`${successCount} pedido(s) importado(s) com sucesso!`)
    }
    
    if (errorCount > 0) {
      toast.error(`${errorCount} pedido(s) com erro`)
    }
    
    if (successCount > 0 && errorCount === 0) {
      setShowImportModal(false)
      setImportData([])
      setImportErrors([])
    }
  }

  const downloadTemplate = () => {
    const headers = 'nr_pedido;cliente;medico;vendedor;data;produto;qtd;total;rastreio;status'
    const example = '1234;João Silva;Dr. Carlos;Ana Maria;15/01/2025;3000mg Full;5;5000,00;ABC123;Em Separação'
    const csv = headers + '\n' + example
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'modelo_importacao_pedidos.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ==================== JUDICIALIZAÇÕES ====================
  const addJudicializacao = async (judic: Partial<Judicializacao>) => {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('judicializacoes').insert({
      periodo_id: periodoAtual,
      ...judic,
      criado_por: currentUser?.id
    }).select().single()
    
    if (error) { toast.error('Erro ao criar judicialização'); return }
    if (data) setJudicializacoes([data, ...judicializacoes])
    toast.success('Judicialização criada!')
  }

  const updateJudicializacao = async (id: string, field: string, value: any) => {
    const supabase = getSupabase()
    await supabase.from('judicializacoes').update({ [field]: value }).eq('id', id)
    setJudicializacoes(judicializacoes.map(j => j.id === id ? { ...j, [field]: value } : j))
  }

  const deleteJudicializacao = async (id: string) => {
    const supabase = getSupabase()
    await supabase.from('judicializacoes').delete().eq('id', id)
    setJudicializacoes(judicializacoes.filter(j => j.id !== id))
    toast.success('Excluído')
  }

  // ==================== CONTROLE DE ENVIOS ====================
  const addControleEnvio = async (envio: Partial<ControleEnvio>) => {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('controle_envios').insert({
      periodo_id: periodoAtual,
      ...envio,
      criado_por: currentUser?.id
    }).select().single()
    
    if (error) { toast.error('Erro ao criar envio'); return }
    if (data) setControleEnvios([data, ...controleEnvios])
    toast.success('Envio registrado!')
  }

  const updateControleEnvio = async (id: string, field: string, value: any) => {
    const supabase = getSupabase()
    await supabase.from('controle_envios').update({ [field]: value }).eq('id', id)
    setControleEnvios(controleEnvios.map(e => e.id === id ? { ...e, [field]: value } : e))
  }

  const deleteControleEnvio = async (id: string) => {
    const supabase = getSupabase()
    await supabase.from('controle_envios').delete().eq('id', id)
    setControleEnvios(controleEnvios.filter(e => e.id !== id))
    toast.success('Excluído')
  }

  // Função para editar Controle de Envio
  const openEditEnvio = (envio: ControleEnvio) => {
    setEditingEnvio({ ...envio })
    setShowEditEnvio(true)
  }

  const saveEditEnvio = async () => {
    if (!editingEnvio) return
    if (!editingEnvio.nome || !editingEnvio.produto) {
      toast.error('Preencha nome e produto')
      return
    }
    const supabase = getSupabase()
    const { error } = await supabase.from('controle_envios').update({
      nome: editingEnvio.nome,
      produto: editingEnvio.produto,
      qtd: editingEnvio.qtd,
      data: editingEnvio.data,
      rastreio: editingEnvio.rastreio,
      status: editingEnvio.status
    }).eq('id', editingEnvio.id)

    if (error) { toast.error('Erro ao atualizar'); return }
    setControleEnvios(controleEnvios.map(e => e.id === editingEnvio.id ? editingEnvio : e))
    setShowEditEnvio(false)
    setEditingEnvio(null)
    toast.success('Envio atualizado!')
  }

  // Função para editar Judicialização
  const openEditJudic = (judic: Judicializacao) => {
    setEditingJudic({ ...judic })
    setShowEditJudic(true)
  }

  const saveEditJudic = async () => {
    if (!editingJudic) return
    if (!editingJudic.cliente || !editingJudic.produto) {
      toast.error('Preencha cliente e produto')
      return
    }
    const supabase = getSupabase()
    const { error } = await supabase.from('judicializacoes').update({
      nr_processo: editingJudic.nr_processo,
      cliente: editingJudic.cliente,
      advogado: editingJudic.advogado,
      produto: editingJudic.produto,
      qtd: editingJudic.qtd,
      total: editingJudic.total,
      data: editingJudic.data,
      status: editingJudic.status,
      observacoes: editingJudic.observacoes
    }).eq('id', editingJudic.id)

    if (error) { toast.error('Erro ao atualizar'); return }
    setJudicializacoes(judicializacoes.map(j => j.id === editingJudic.id ? editingJudic : j))
    setShowEditJudic(false)
    setEditingJudic(null)
    toast.success('Judicialização atualizada!')
  }

  // Função para editar Vendedor
  const openEditVendedor = (vendedor: Vendedor) => {
    setEditingVendedor({ ...vendedor })
    setShowEditVendedor(true)
  }

  const saveEditVendedor = async () => {
    if (!editingVendedor) return
    if (!editingVendedor.nome.trim()) {
      toast.error('Digite o nome do vendedor')
      return
    }
    const supabase = getSupabase()
    const { error } = await supabase.from('vendedores').update({
      nome: editingVendedor.nome.trim()
    }).eq('id', editingVendedor.id)

    if (error) { toast.error('Erro ao atualizar'); return }
    await loadVendedores()
    setShowEditVendedor(false)
    setEditingVendedor(null)
    toast.success('Vendedor atualizado!')
  }

  // Função para editar Usuário
  const openEditUser = (user: Usuario) => {
    setEditingUser({ ...user })
    setEditUserData({ email: user.email, senha: '' })
    setShowEditUser(true)
  }

  const saveEditUser = async () => {
    if (!editingUser) return
    if (!editUserData.email.trim()) {
      toast.error('Digite o email')
      return
    }
    const supabase = getSupabase()
    const updateData: { email: string; senha?: string } = {
      email: editUserData.email.trim()
    }
    // Só atualiza senha se foi preenchida
    if (editUserData.senha.trim()) {
      updateData.senha = editUserData.senha.trim()
    }
    const { error } = await supabase.from('usuarios').update(updateData).eq('id', editingUser.id)

    if (error) { toast.error('Erro ao atualizar'); return }
    const { data } = await supabase.from('usuarios').select('*').order('nome')
    if (data) setUsuarios(data)
    setShowEditUser(false)
    setEditingUser(null)
    setEditUserData({ email: '', senha: '' })
    toast.success('Usuário atualizado!')
  }

  // ==================== ÁREA DE TRABALHO ====================
  const coresPostIt = [
    { nome: 'Amarelo', valor: '#fef08a' },
    { nome: 'Rosa', valor: '#fbcfe8' },
    { nome: 'Azul', valor: '#bfdbfe' },
    { nome: 'Verde', valor: '#bbf7d0' },
    { nome: 'Roxo', valor: '#ddd6fe' },
    { nome: 'Laranja', valor: '#fed7aa' },
  ]

  const prioridadeConfig = {
    baixa: { cor: 'bg-slate-100 text-slate-600', label: 'Baixa' },
    media: { cor: 'bg-blue-100 text-blue-600', label: 'Média' },
    alta: { cor: 'bg-amber-100 text-amber-600', label: 'Alta' },
    urgente: { cor: 'bg-red-100 text-red-600', label: 'Urgente' }
  }

  const addPostIt = async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('postits').insert({
      usuario_id: currentUser?.id,
      conteudo: '',
      cor: '#fef08a',
      posicao_x: Math.floor(20 + Math.random() * 100),
      posicao_y: Math.floor(20 + Math.random() * 100),
      largura: 200,
      altura: 150,
      prioridade: 'media'
    }).select().single()
    
    if (error) { 
      console.error('Erro post-it:', error)
      toast.error(`Erro ao criar post-it: ${error.message}`)
      return 
    }
    if (data) setPostIts([data, ...postIts])
  }

  const updatePostIt = async (id: string, updates: Partial<PostIt>) => {
    const supabase = getSupabase()
    await supabase.from('postits').update(updates).eq('id', id)
    setPostIts(postIts.map(p => p.id === id ? { ...p, ...updates } : p))
  }

  const deletePostIt = async (id: string) => {
    const supabase = getSupabase()
    await supabase.from('postits').delete().eq('id', id)
    setPostIts(postIts.filter(p => p.id !== id))
  }

  const addListaTarefas = async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('lista_tarefas').insert({
      usuario_id: currentUser?.id,
      titulo: 'Nova Lista',
      cor: '#bfdbfe',
      posicao_x: Math.floor(20 + Math.random() * 100),
      posicao_y: Math.floor(20 + Math.random() * 100)
    }).select().single()
    
    if (error) { 
      console.error('Erro lista:', error)
      toast.error(`Erro ao criar lista: ${error.message}`)
      return 
    }
    if (data) setListaTarefas([data, ...listaTarefas])
  }

  const updateListaTarefas = async (id: string, updates: Partial<ListaTarefas>) => {
    const supabase = getSupabase()
    await supabase.from('lista_tarefas').update(updates).eq('id', id)
    setListaTarefas(listaTarefas.map(l => l.id === id ? { ...l, ...updates } : l))
  }

  const deleteListaTarefas = async (id: string) => {
    const supabase = getSupabase()
    await supabase.from('lista_tarefas').delete().eq('id', id)
    await supabase.from('tarefas').delete().eq('lista_id', id)
    setListaTarefas(listaTarefas.filter(l => l.id !== id))
    setTarefas(tarefas.filter(t => t.lista_id !== id))
  }

  const addTarefa = async (listaId: string) => {
    // Primeiro, força o blur de qualquer input ativo para salvar dados pendentes
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    
    // Pequeno delay para garantir que o blur foi processado
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const supabase = getSupabase()
    const maxOrdem = tarefas.filter(t => t.lista_id === listaId).reduce((max, t) => Math.max(max, t.ordem), 0)
    const { error } = await supabase.from('tarefas').insert({
      usuario_id: currentUser?.id,
      lista_id: listaId,
      texto: '',
      concluida: false,
      ordem: maxOrdem + 1
    }).select().single()
    
    if (error) { toast.error('Erro ao criar tarefa'); return }
    
    // Recarrega todas as tarefas do usuário para garantir sincronização
    const { data: tarefasAtualizadas } = await supabase
      .from('tarefas')
      .select('*')
      .eq('usuario_id', currentUser?.id)
      .order('ordem')
    
    if (tarefasAtualizadas) setTarefas(tarefasAtualizadas)
  }

  const updateTarefa = async (id: string, updates: Partial<Tarefa>) => {
    const supabase = getSupabase()
    await supabase.from('tarefas').update(updates).eq('id', id)
    setTarefas(tarefas.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  const deleteTarefa = async (id: string) => {
    const supabase = getSupabase()
    await supabase.from('tarefas').delete().eq('id', id)
    setTarefas(tarefas.filter(t => t.id !== id))
  }

  // ==================== CRUD CLIENTES ====================
  const loadClientes = async () => {
    const supabase = getSupabase()
    const { data } = await supabase.from('clientes').select('*').order('razao_social')
    if (data) setClientes(data)
  }

  const addCliente = async () => {
    if (!newCliente.razao_social.trim()) {
      toast.error('Razão social é obrigatória')
      return
    }
    const supabase = getSupabase()
    const { error } = await supabase.from('clientes').insert({
      ...newCliente,
      ativo: true
    })
    if (error) {
      toast.error('Erro ao cadastrar cliente')
      return
    }
    toast.success('Cliente cadastrado!')
    setNewCliente({ razao_social: '', cnpj: '', endereco: '', cidade: '', estado: '', cep: '', telefone: '', email: '', contato: '' })
    setShowAddCliente(false)
    loadClientes()
  }

  const saveEditCliente = async () => {
    if (!editingCliente) return
    const supabase = getSupabase()
    const { error } = await supabase.from('clientes').update({
      razao_social: editingCliente.razao_social,
      cnpj: editingCliente.cnpj,
      endereco: editingCliente.endereco,
      cidade: editingCliente.cidade,
      estado: editingCliente.estado,
      cep: editingCliente.cep,
      telefone: editingCliente.telefone,
      email: editingCliente.email,
      contato: editingCliente.contato,
    }).eq('id', editingCliente.id)
    if (error) {
      toast.error('Erro ao atualizar cliente')
      return
    }
    toast.success('Cliente atualizado!')
    setShowEditCliente(false)
    setEditingCliente(null)
    loadClientes()
  }

  const deleteCliente = async (id: string) => {
    const supabase = getSupabase()
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir cliente. Pode estar vinculado a orçamentos.')
      return
    }
    toast.success('Cliente excluído!')
    loadClientes()
  }

  // ==================== CRUD ORCAMENTOS ====================
  const loadOrcamentos = async () => {
    const supabase = getSupabase()
    const { data } = await supabase.from('orcamentos').select('*').order('criado_em', { ascending: false })
    if (data) setOrcamentos(data)
  }

  const generateOrcamentoNumber = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const count = orcamentos.filter(o => {
      const d = new Date(o.criado_em)
      return d.getFullYear() === year && d.getMonth() + 1 === parseInt(month)
    }).length + 1
    return `ORC${year}${month}${String(count).padStart(3, '0')}`
  }

  const resetOrcamentoForm = () => {
    setOrcamentoForm({
      numero: generateOrcamentoNumber(),
      data: getTodayInSaoPaulo(),
      cliente_id: '',
      empresa_nome: 'Carmens Medicinals',
      empresa_endereco: '1241 Stirling rd UNIT 101',
      empresa_cidade: 'Dania Beach, Florida - USA, 33004',
      empresa_telefone: '',
      empresa_email: '',
      observacoes: '',
      itens: [{ descricao: '', qtd: 1, preco_unitario: 0, preco_total: 0 }]
    })
  }

  const addOrcamentoItem = () => {
    setOrcamentoForm({
      ...orcamentoForm,
      itens: [...orcamentoForm.itens, { descricao: '', qtd: 1, preco_unitario: 0, preco_total: 0 }]
    })
  }

  const removeOrcamentoItem = (index: number) => {
    if (orcamentoForm.itens.length <= 1) return
    setOrcamentoForm({
      ...orcamentoForm,
      itens: orcamentoForm.itens.filter((_, i) => i !== index)
    })
  }

  const updateOrcamentoItem = (index: number, field: keyof OrcamentoItem, value: string | number) => {
    const itens = [...orcamentoForm.itens]
    const item = { ...itens[index] }
    if (field === 'descricao') {
      item.descricao = value as string
    } else if (field === 'qtd') {
      item.qtd = typeof value === 'number' ? value : parseInt(value as string) || 0
      item.preco_total = item.qtd * item.preco_unitario
    } else if (field === 'preco_unitario') {
      item.preco_unitario = typeof value === 'number' ? value : parseCurrency(value as string)
      item.preco_total = item.qtd * item.preco_unitario
    }
    itens[index] = item
    setOrcamentoForm({ ...orcamentoForm, itens })
  }

  const calcularTotalOrcamento = () => {
    return orcamentoForm.itens.reduce((sum, item) => sum + (item.qtd * item.preco_unitario), 0)
  }

  const saveOrcamento = async (status: 'Rascunho' | 'Enviado' = 'Rascunho') => {
    if (!orcamentoForm.cliente_id) {
      toast.error('Selecione um cliente')
      return
    }
    if (orcamentoForm.itens.some(i => !i.descricao.trim())) {
      toast.error('Preencha a descrição de todos os itens')
      return
    }

    const supabase = getSupabase()
    const cliente = clientes.find(c => c.id === orcamentoForm.cliente_id)
    const valorTotal = calcularTotalOrcamento()

    const orcamentoData = {
      numero: orcamentoForm.numero,
      data: orcamentoForm.data,
      cliente_id: orcamentoForm.cliente_id,
      cliente_nome: cliente?.razao_social || '',
      empresa_nome: orcamentoForm.empresa_nome,
      empresa_endereco: orcamentoForm.empresa_endereco,
      empresa_cidade: orcamentoForm.empresa_cidade,
      empresa_telefone: orcamentoForm.empresa_telefone,
      empresa_email: orcamentoForm.empresa_email,
      observacoes: orcamentoForm.observacoes,
      valor_total: valorTotal,
      status,
      criado_por: currentUser?.id,
      itens: orcamentoForm.itens.map(i => ({
        descricao: i.descricao,
        qtd: i.qtd,
        preco_unitario: i.preco_unitario,
        preco_total: i.qtd * i.preco_unitario
      }))
    }

    if (editingOrcamento) {
      const { error } = await supabase.from('orcamentos').update(orcamentoData).eq('id', editingOrcamento.id)
      if (error) {
        toast.error('Erro ao atualizar orçamento')
        return
      }
      toast.success('Orçamento atualizado!')
    } else {
      const { error } = await supabase.from('orcamentos').insert(orcamentoData)
      if (error) {
        toast.error('Erro ao salvar orçamento')
        return
      }
      toast.success('Orçamento salvo!')
    }

    setOrcamentoView('list')
    setEditingOrcamento(null)
    loadOrcamentos()
  }

  const deleteOrcamento = async (id: string) => {
    const supabase = getSupabase()
    const { error } = await supabase.from('orcamentos').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir orçamento')
      return
    }
    toast.success('Orçamento excluído!')
    loadOrcamentos()
  }

  const editOrcamento = (orc: Orcamento) => {
    setEditingOrcamento(orc)
    setOrcamentoForm({
      numero: orc.numero,
      data: orc.data,
      cliente_id: orc.cliente_id,
      empresa_nome: orc.empresa_nome,
      empresa_endereco: orc.empresa_endereco,
      empresa_cidade: orc.empresa_cidade,
      empresa_telefone: orc.empresa_telefone,
      empresa_email: orc.empresa_email,
      observacoes: orc.observacoes,
      itens: orc.itens && orc.itens.length > 0 ? orc.itens : [{ descricao: '', qtd: 1, preco_unitario: 0, preco_total: 0 }]
    })
    setOrcamentoView('edit')
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      setLogoBase64(base64)
      localStorage.setItem('orcamento-logo', base64)
      toast.success('Logo carregado!')
    }
    reader.readAsDataURL(file)
  }

  // ==================== GERAÇÃO DE PDF ====================
  const generatePDF = useCallback((orc: Orcamento) => {
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 15
    const contentWidth = pageWidth - margin * 2
    let yPos = margin

    // Colors
    const primaryColor: [number, number, number] = [23, 37, 84] // dark navy
    const accentColor: [number, number, number] = [234, 88, 12] // orange
    const lightGray: [number, number, number] = [241, 245, 249]

    // Header background
    doc.setFillColor(...lightGray)
    doc.roundedRect(margin, yPos, contentWidth, 45, 3, 3, 'F')

    // Logo (682x215 aspect ratio = ~3.17:1)
    if (logoBase64) {
      try {
        const logoWidth = 50
        const logoHeight = logoWidth * (215 / 682) // maintain aspect ratio
        const logoY = yPos + (45 - logoHeight) / 2 // vertically center in header
        doc.addImage(logoBase64, 'PNG', margin + 5, logoY, logoWidth, logoHeight)
      } catch { /* ignore logo errors */ }
    }

    // Company info (right side)
    const companyX = pageWidth - margin - 5
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...primaryColor)
    doc.text(orc.empresa_nome, companyX, yPos + 12, { align: 'right' })
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(orc.empresa_endereco, companyX, yPos + 18, { align: 'right' })
    doc.text(orc.empresa_cidade, companyX, yPos + 23, { align: 'right' })
    if (orc.empresa_telefone) doc.text(orc.empresa_telefone, companyX, yPos + 28, { align: 'right' })
    if (orc.empresa_email) doc.text(orc.empresa_email, companyX, yPos + 33, { align: 'right' })

    yPos += 52

    // Title bar
    doc.setFillColor(...primaryColor)
    doc.roundedRect(margin, yPos, contentWidth, 12, 2, 2, 'F')
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('Commercial Invoice', margin + 5, yPos + 8.5)

    // Order info on the right of title bar
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Date: ${formatDateBR(orc.data)}  |  Order: ${orc.numero}`, pageWidth - margin - 5, yPos + 8.5, { align: 'right' })

    yPos += 20

    // Client info box
    const cliente = clientes.find(c => c.id === orc.cliente_id)
    doc.setFillColor(...lightGray)
    doc.roundedRect(margin, yPos, contentWidth, 32, 2, 2, 'F')

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...primaryColor)
    doc.text('Bill To', margin + 5, yPos + 7)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(51, 65, 85)
    let clientY = yPos + 13
    if (cliente) {
      doc.setFont('helvetica', 'bold')
      doc.text(cliente.razao_social, margin + 5, clientY)
      doc.setFont('helvetica', 'normal')
      clientY += 5
      if (cliente.cnpj) { doc.text(`CNPJ: ${cliente.cnpj}`, margin + 5, clientY); clientY += 5 }
      if (cliente.endereco) { doc.text(cliente.endereco, margin + 5, clientY); clientY += 5 }
      if (cliente.cidade || cliente.estado) { doc.text(`${cliente.cidade}${cliente.estado ? ', ' + cliente.estado : ''}${cliente.cep ? ' - ' + cliente.cep : ''}`, margin + 5, clientY) }
    } else {
      doc.text(orc.cliente_nome || 'Cliente não encontrado', margin + 5, clientY)
    }

    yPos += 38

    // Items table
    const items = orc.itens || []
    const tableData = items.map(item => [
      item.descricao,
      String(item.qtd).padStart(2, '0'),
      formatCurrency(item.preco_unitario),
      formatCurrency(item.qtd * item.preco_unitario)
    ])

    autoTable(doc, {
      startY: yPos,
      head: [['Description', 'Qty', 'Unit Price', 'Amount']],
      body: tableData,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 9,
        cellPadding: 4,
        textColor: [51, 65, 85],
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' },
      },
    })

    // Total
    const finalY = (doc as any).lastAutoTable.finalY + 5
    doc.setFillColor(...primaryColor)
    doc.roundedRect(pageWidth - margin - 80, finalY, 80, 14, 2, 2, 'F')
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('Total BRL', pageWidth - margin - 75, finalY + 9.5)
    doc.text(`R$ ${formatCurrency(orc.valor_total)}`, pageWidth - margin - 5, finalY + 9.5, { align: 'right' })

    // Observations
    if (orc.observacoes) {
      const obsY = finalY + 22
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...primaryColor)
      doc.text('Observações', margin, obsY)
      doc.setDrawColor(...accentColor)
      doc.setLineWidth(0.5)
      doc.line(margin, obsY + 2, margin + 30, obsY + 2)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      const splitObs = doc.splitTextToSize(orc.observacoes, contentWidth)
      doc.text(splitObs, margin, obsY + 8)
    }

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 15
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)
    doc.setFontSize(7)
    doc.setTextColor(148, 163, 184)
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} | ${orc.empresa_nome}`, pageWidth / 2, footerY, { align: 'center' })

    doc.save(`Orcamento_${orc.numero}.pdf`)
    toast.success('PDF gerado com sucesso!')
  }, [clientes, logoBase64])

  const filteredPedidos = useMemo(() => pedidos.filter(p => {
    const matchStatus = filtroStatus === 'Todos' || p.status === filtroStatus
    const matchSearch = !searchTerm || p.cliente.toLowerCase().includes(searchTerm.toLowerCase()) || p.nr_pedido.toLowerCase().includes(searchTerm.toLowerCase()) || p.produto.toLowerCase().includes(searchTerm.toLowerCase())
    return matchStatus && matchSearch
  }), [pedidos, filtroStatus, searchTerm])

  const stats = {
    total: pedidos.length,
    emSeparacao: pedidos.filter(p => p.status === 'Em Separação').length,
    emTransito: pedidos.filter(p => p.status === 'Em Trânsito').length,
    anvisa: pedidos.filter(p => p.status === 'Anvisa').length,
    problemaAnvisa: pedidos.filter(p => p.status === 'Problema Anvisa').length,
    atraso: pedidos.filter(p => p.status === 'Atraso').length,
    docRecusado: pedidos.filter(p => p.status === 'Doc. Recusado').length,
    thc2000: pedidos.filter(p => p.status === 'THC / 2000').length
  }

  const currentPeriodo = periodos.find(p => p.id === periodoAtual)

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
      </div>
    )
  }

  // Login
  if (!currentUser) {
    return <LoginScreen onLogin={setCurrentUser} />
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <Toaster position="top-right" richColors />
      
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-orange-500 rounded-xl shadow-lg">
              <PackageOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Controle de Pedidos</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${syncing ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
              {syncing ? <><RefreshCw className="w-3 h-3 animate-spin" /> <span>Sync</span></> : <><Database className="w-3 h-3" /> <span>Online</span></>}
            </div>

            {activeTab !== 'pedidos' && (
              <>
                <Select value={periodoAtual} onValueChange={handlePeriodoChange}>
                  <SelectTrigger className="w-[180px]"><Calendar className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
                  <SelectContent>{periodos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                </Select>

                {isAdmin && (
                  <Dialog open={showNovoPeriodo} onOpenChange={setShowNovoPeriodo}>
                    <DialogTrigger asChild><Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-1" />Período</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Novo Período</DialogTitle></DialogHeader>
                      <div className="space-y-4 pt-4">
                        <Input placeholder="Ex: Fevereiro 2026" value={novoPeriodoNome} onChange={(e) => setNovoPeriodoNome(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addPeriodo()} />
                        <Button onClick={addPeriodo} className="w-full">Criar</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </>
            )}

            <div className="flex items-center gap-2 pl-3 border-l">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isAdmin ? 'bg-orange-100' : 'bg-slate-100'}`}>
                {isAdmin ? <Shield className="w-4 h-4 text-orange-600" /> : <User className="w-4 h-4" />}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium">{currentUser.nome}</p>
                <p className="text-xs text-slate-500">{isAdmin ? 'Admin' : 'Colaborador'}</p>
              </div>
              <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm"><LogOut className="w-4 h-4" /></Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Confirmar saída</DialogTitle>
                    <DialogDescription>Tem certeza que deseja sair do sistema?</DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setShowLogoutConfirm(false)}>Cancelar</Button>
                    <Button variant="destructive" onClick={handleLogout}>Sair</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        {isAdmin ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList>
              <TabsTrigger value="workspace"><LayoutDashboard className="w-4 h-4 mr-2" />Área de Trabalho</TabsTrigger>
              <TabsTrigger value="pedidos"><Package className="w-4 h-4 mr-2" />Pedidos</TabsTrigger>
              <TabsTrigger value="judicializacoes"><Scale className="w-4 h-4 mr-2" />Judicializações</TabsTrigger>
              <TabsTrigger value="envios"><Send className="w-4 h-4 mr-2" />Controle de Envios</TabsTrigger>
              <TabsTrigger value="thc2000"><Receipt className="w-4 h-4 mr-2" />THC-2000</TabsTrigger>
              <TabsTrigger value="vendedores"><UserCog className="w-4 h-4 mr-2" />Vendedores</TabsTrigger>
              <TabsTrigger value="orcamentos"><FileText className="w-4 h-4 mr-2" />Gerador de Orçamento</TabsTrigger>
              <TabsTrigger value="usuarios"><Shield className="w-4 h-4 mr-2" />Usuários</TabsTrigger>
            </TabsList>
            <TabsContent value="workspace">{renderAreaTrabalho()}</TabsContent>
            <TabsContent value="pedidos">{renderPedidos()}</TabsContent>
            <TabsContent value="judicializacoes">{renderJudicializacoes()}</TabsContent>
            <TabsContent value="envios">{renderControleEnvios()}</TabsContent>
            <TabsContent value="thc2000">{renderThc2000()}</TabsContent>
            <TabsContent value="vendedores">{renderVendedores()}</TabsContent>
            <TabsContent value="orcamentos">{renderGeradorOrcamento()}</TabsContent>
            <TabsContent value="usuarios">{renderUsuarios()}</TabsContent>
          </Tabs>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList>
              <TabsTrigger value="workspace"><LayoutDashboard className="w-4 h-4 mr-2" />Área de Trabalho</TabsTrigger>
              <TabsTrigger value="pedidos"><Package className="w-4 h-4 mr-2" />Pedidos</TabsTrigger>
              <TabsTrigger value="thc2000"><Receipt className="w-4 h-4 mr-2" />THC-2000</TabsTrigger>
            </TabsList>
            <TabsContent value="workspace">{renderAreaTrabalho()}</TabsContent>
            <TabsContent value="pedidos">{renderPedidos()}</TabsContent>
            <TabsContent value="thc2000">{renderThc2000()}</TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  )

  function renderAreaTrabalho() {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <LayoutDashboard className="w-6 h-6 text-indigo-600" />
              Área de Trabalho
            </h2>
            <p className="text-sm text-slate-500">Seu mural pessoal de tarefas e anotações</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={addPostIt} variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50">
              <StickyNote className="w-4 h-4 mr-2" />Novo Post-it
            </Button>
            <Button onClick={addListaTarefas} variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50">
              <ListTodo className="w-4 h-4 mr-2" />Nova Lista
            </Button>
          </div>
        </div>

        {/* Legenda de prioridades */}
        <div className="flex items-center gap-4 text-xs">
          <span className="text-slate-500">Prioridades:</span>
          {Object.entries(prioridadeConfig).map(([key, config]) => (
            <span key={key} className={`px-2 py-1 rounded ${config.cor}`}>
              <Flag className="w-3 h-3 inline mr-1" />{config.label}
            </span>
          ))}
        </div>

        {/* Mural */}
        <div className="relative min-h-[600px] bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-4 overflow-auto">
          {postIts.length === 0 && listaTarefas.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <StickyNote className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Seu mural está vazio</p>
                <p className="text-sm">Clique em "Novo Post-it" ou "Nova Lista" para começar</p>
              </div>
            </div>
          )}

          {/* Post-its */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Post-its por prioridade */}
            {['urgente', 'alta', 'media', 'baixa'].map(prioridade => {
              const postItsPrioridade = postIts.filter(p => p.prioridade === prioridade)
              if (postItsPrioridade.length === 0) return null
              
              return (
                <div key={prioridade} className="col-span-full">
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium mb-2 ${prioridadeConfig[prioridade as keyof typeof prioridadeConfig].cor}`}>
                    <Flag className="w-3 h-3" />
                    {prioridadeConfig[prioridade as keyof typeof prioridadeConfig].label}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {postItsPrioridade.map(postit => (
                      <div 
                        key={postit.id} 
                        className="rounded-lg shadow-md p-4 relative group transition-transform hover:scale-[1.02] hover:shadow-lg"
                        style={{ backgroundColor: postit.cor }}
                      >
                        {/* Ações */}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <div className="relative">
                            <button
                              className="w-7 h-7 rounded-lg bg-white/90 shadow-sm flex items-center justify-center hover:bg-white hover:shadow-md transition-all peer"
                              title="Mudar cor"
                            >
                              <Palette className="w-4 h-4 text-slate-600" />
                            </button>
                            <div className="absolute top-full right-0 mt-1 p-2 bg-white rounded-lg shadow-xl border hidden peer-focus:block hover:block z-50 min-w-[90px]">
                              <div className="grid grid-cols-3 gap-1.5">
                                {coresPostIt.map(c => (
                                  <button
                                    key={c.valor}
                                    onClick={() => updatePostIt(postit.id, { cor: c.valor })}
                                    className={`w-6 h-6 rounded-md border-2 transition-transform hover:scale-110 ${postit.cor === c.valor ? 'border-slate-500 scale-110' : 'border-white'}`}
                                    style={{ backgroundColor: c.valor }}
                                    title={c.nome}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => deletePostIt(postit.id)}
                            className="w-7 h-7 rounded-lg bg-white/90 shadow-sm text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white hover:shadow-md transition-all"
                            title="Excluir"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Prioridade */}
                        <select
                          value={postit.prioridade}
                          onChange={(e) => updatePostIt(postit.id, { prioridade: e.target.value as any })}
                          className={`text-xs px-2 py-0.5 rounded mb-2 cursor-pointer border-0 ${prioridadeConfig[postit.prioridade].cor}`}
                        >
                          <option value="baixa">🏳️ Baixa</option>
                          <option value="media">🔵 Média</option>
                          <option value="alta">🟡 Alta</option>
                          <option value="urgente">🔴 Urgente</option>
                        </select>

                        {/* Conteúdo */}
                        <PostItTextarea
                          value={postit.conteudo}
                          onSave={(conteudo) => updatePostIt(postit.id, { conteudo })}
                          placeholder="Digite sua anotação..."
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Listas de Tarefas */}
            {listaTarefas.length > 0 && (
              <div className="col-span-full mt-6">
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium mb-2 bg-slate-200 text-slate-700">
                  <ListTodo className="w-3 h-3" />
                  Listas de Tarefas
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {listaTarefas.map(lista => {
                    const tarefasLista = tarefas.filter(t => t.lista_id === lista.id)
                    const concluidas = tarefasLista.filter(t => t.concluida).length
                    
                    return (
                      <div 
                        key={lista.id} 
                        className="rounded-lg shadow-md p-4 relative group"
                        style={{ backgroundColor: lista.cor }}
                      >
                        {/* Ações */}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <div className="relative">
                            <button
                              className="w-7 h-7 rounded-lg bg-white/90 shadow-sm flex items-center justify-center hover:bg-white hover:shadow-md transition-all peer"
                              title="Mudar cor"
                            >
                              <Palette className="w-4 h-4 text-slate-600" />
                            </button>
                            <div className="absolute top-full right-0 mt-1 p-2 bg-white rounded-lg shadow-xl border hidden peer-focus:block hover:block z-50 min-w-[90px]">
                              <div className="grid grid-cols-3 gap-1.5">
                                {coresPostIt.map(c => (
                                  <button
                                    key={c.valor}
                                    onClick={() => updateListaTarefas(lista.id, { cor: c.valor })}
                                    className={`w-6 h-6 rounded-md border-2 transition-transform hover:scale-110 ${lista.cor === c.valor ? 'border-slate-500 scale-110' : 'border-white'}`}
                                    style={{ backgroundColor: c.valor }}
                                    title={c.nome}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteListaTarefas(lista.id)}
                            className="w-7 h-7 rounded-lg bg-white/90 shadow-sm text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white hover:shadow-md transition-all"
                            title="Excluir lista"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Título */}
                        <BlurInput
                          value={lista.titulo}
                          onSave={(titulo) => updateListaTarefas(lista.id, { titulo })}
                          className="font-bold text-sm w-full bg-transparent border-0 focus:outline-none mb-2"
                          placeholder="Título da lista"
                        />

                        {/* Progresso */}
                        <div className="text-xs text-slate-600 mb-2">
                          {concluidas}/{tarefasLista.length} concluídas
                        </div>

                        {/* Tarefas */}
                        <div className="space-y-1 max-h-[200px] overflow-y-auto">
                          {tarefasLista.map(tarefa => (
                            <div key={tarefa.id} className="flex items-center gap-2 group/tarefa">
                              <button
                                onClick={() => updateTarefa(tarefa.id, { concluida: !tarefa.concluida })}
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                  tarefa.concluida 
                                    ? 'bg-green-500 border-green-500 text-white' 
                                    : 'border-slate-400 hover:border-green-500'
                                }`}
                              >
                                {tarefa.concluida && <Check className="w-3 h-3" />}
                              </button>
                              <BlurInput
                                value={tarefa.texto}
                                onSave={(texto) => updateTarefa(tarefa.id, { texto })}
                                className={`flex-1 text-sm bg-transparent border-0 focus:outline-none ${
                                  tarefa.concluida ? 'line-through text-slate-500' : ''
                                }`}
                                placeholder="Nova tarefa..."
                              />
                              <button
                                onClick={() => deleteTarefa(tarefa.id)}
                                className="w-5 h-5 rounded text-red-500 opacity-0 group-hover/tarefa:opacity-100 hover:bg-red-100"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Adicionar tarefa */}
                        <button
                          onClick={() => addTarefa(lista.id)}
                          className="mt-2 text-xs text-slate-600 hover:text-slate-800 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Adicionar tarefa
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  function renderPedidosPeriodoSelector() {
    // Group periods by year
    const periodosByYear: Record<number, Periodo[]> = {}
    periodos.forEach(p => {
      if (!periodosByYear[p.ano]) periodosByYear[p.ano] = []
      periodosByYear[p.ano].push(p)
    })
    const sortedYears = Object.keys(periodosByYear).map(Number).sort((a, b) => b - a)

    const mesesAbrev: Record<string, string> = {
      'janeiro': 'Jan', 'fevereiro': 'Fev', 'março': 'Mar', 'abril': 'Abr',
      'maio': 'Mai', 'junho': 'Jun', 'julho': 'Jul', 'agosto': 'Ago',
      'setembro': 'Set', 'outubro': 'Out', 'novembro': 'Nov', 'dezembro': 'Dez'
    }
    const getAbrev = (nome: string) => {
      const palavra = nome.trim().split(/\s+/)[0].toLowerCase()
      return mesesAbrev[palavra] || nome.substring(0, 3)
    }

    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="inline-flex p-4 bg-orange-100 dark:bg-orange-900/30 rounded-2xl mb-4">
            <Calendar className="w-10 h-10 text-orange-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Selecione o Período</h2>
          <p className="text-slate-500 dark:text-slate-400">Escolha o mês para visualizar os pedidos</p>
        </div>

        {sortedYears.map(year => (
          <div key={year}>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">{year}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {periodosByYear[year]
                .sort((a, b) => b.mes - a.mes)
                .map(p => (
                <Card
                  key={p.id}
                  className="cursor-pointer hover:shadow-lg hover:border-orange-300 dark:hover:border-orange-600 transition-all duration-200 hover:-translate-y-1"
                  onClick={() => handlePedidosPeriodoSelect(p.id)}
                >
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-orange-500 mb-1">{getAbrev(p.nome)}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{p.nome}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {isAdmin && (
          <div className="text-center pt-4">
            <Dialog open={showNovoPeriodo} onOpenChange={setShowNovoPeriodo}>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg" className="border-dashed border-2">
                  <Plus className="w-5 h-5 mr-2" />Criar Novo Período
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo Período</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input placeholder="Ex: Fevereiro 2026" value={novoPeriodoNome} onChange={(e) => setNovoPeriodoNome(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addPeriodo()} />
                  <Button onClick={addPeriodo} className="w-full">Criar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    )
  }

  function renderPedidos() {
    if (!pedidosPeriodoSelecionado) {
      return renderPedidosPeriodoSelector()
    }

    return (
      <>
        {/* Back button + period name */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => { setPedidosPeriodoSelecionado(false); setPedidos([]) }} className="text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <span className="text-sm text-slate-400">|</span>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> {currentPeriodo?.nome}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
          <Card><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">Total</p><p className="text-3xl font-bold">{stats.total}</p></div><div className="p-3 bg-slate-100 rounded-xl"><Package className="w-6 h-6" /></div></div></CardContent></Card>
          {Object.entries({ 'Em Separação': stats.emSeparacao, 'Em Trânsito': stats.emTransito, 'Anvisa': stats.anvisa, 'Problema Anvisa': stats.problemaAnvisa, 'Atraso': stats.atraso, 'Doc. Recusado': stats.docRecusado, 'THC / 2000': stats.thc2000 }).map(([status, count]) => (
            <Card key={status} className={statusConfig[status].cardClass}><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className={`text-sm font-medium ${statusConfig[status].textClass}`}>{status}</p><p className="text-3xl font-bold">{count}</p></div><div className={`p-3 ${statusConfig[status].iconBgClass} rounded-xl`}>{(() => { const Icon = statusConfig[status].icon; return <Icon className="w-6 h-6" /> })()}</div></div></CardContent></Card>
          ))}
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="border-b pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CardTitle>Pedidos – {currentPeriodo?.nome}</CardTitle>
                {isAdmin && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowImportModal(true)}
                    className="text-green-600 border-green-300 hover:bg-green-50"
                  >
                    <Upload className="w-4 h-4 mr-1" /> Importar
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><Input placeholder="Buscar..." className="pl-9 w-[180px]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">{['Todos', 'Em Separação', 'Em Trânsito', 'Anvisa', 'Problema Anvisa', 'Atraso', 'Doc. Recusado', 'THC / 2000'].map(s => <Button key={s} variant={filtroStatus === s ? 'default' : 'ghost'} size="sm" onClick={() => setFiltroStatus(s)} className="text-xs">{s}</Button>)}</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="bg-slate-50 dark:bg-slate-800"><TableHead>Nº</TableHead><TableHead>Cliente</TableHead><TableHead>Médico</TableHead><TableHead>Vendedor</TableHead><TableHead>Data</TableHead><TableHead>Produto</TableHead><TableHead>QTD</TableHead><TableHead>Total</TableHead><TableHead>Rastreio</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {/* Linha para reservar novo pedido - esconde via CSS quando está editando (evita removeChild) */}
                    <TableRow className="bg-green-50 dark:bg-green-900/20 border-b-2 border-green-200" style={{ display: editingPedidoId ? 'none' : undefined }}>
                      <TableCell>
                        <div className="flex gap-2">
                          <Input
                            value={newRow.nr_pedido}
                            onChange={(e) => setNewRow({...newRow, nr_pedido: e.target.value.toUpperCase()})}
                            onKeyDown={(e) => e.key === 'Enter' && reservePedido()}
                            className="h-8 w-24 font-mono border-green-300 bg-white"
                            placeholder="Nº *"
                          />
                        </div>
                      </TableCell>
                      <TableCell colSpan={9} className="text-slate-500 text-sm">
                        <div className="flex items-center gap-2">
                          <span>← Digite o nº do pedido e clique em</span>
                          <Button size="sm" onClick={reservePedido} disabled={reservingPedido || !newRow.nr_pedido.trim()} className="bg-green-500 hover:bg-green-600 h-7 px-3">
                            {reservingPedido ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /><span>Reservar</span></>}
                          </Button>
                          <span>para iniciar</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  {filteredPedidos.map(p => {
                    // Verifica se este pedido está sendo editado pelo usuário atual
                    const isBeingEditedByMe = editingPedidoId === p.id
                    // Verifica se é um pedido vazio (reservado mas não preenchido)
                    const isPendingFill = !p.cliente && !p.produto
                    // Pode editar se: é admin, ou está editando este pedido, ou é colaborador editando campos permitidos
                    const canEditAllFields = isAdmin || isBeingEditedByMe
                    
                    return (
                      <TableRow key={p.id} className={`group ${isBeingEditedByMe ? 'bg-orange-50 dark:bg-orange-900/20 ring-2 ring-orange-400 ring-inset' : ''} ${isPendingFill && !isBeingEditedByMe ? 'bg-yellow-50 dark:bg-yellow-900/10 opacity-60' : ''}`}>
                        <TableCell className="font-mono text-sm font-semibold align-top pt-3">
                          {p.nr_pedido}
                          {isPendingFill && !isBeingEditedByMe && (
                            <span className="ml-2 text-xs text-yellow-600 font-normal">(em edição)</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          {canEditAllFields ? (
                            <EditableInput 
                              value={p.cliente} 
                              onSave={(v) => updatePedido(p.id, 'cliente', v)} 
                              className={`h-8 ${isBeingEditedByMe ? 'border-orange-300 bg-white' : 'border-transparent hover:border-slate-300'}`} 
                              placeholder="Cliente *" 
                            />
                          ) : (p.cliente ? <span>{p.cliente}</span> : <span className="text-slate-400">-</span>)}
                        </TableCell>
                        <TableCell className="align-top">
                          {canEditAllFields ? (
                            <EditableInput 
                              value={p.medico} 
                              onSave={(v) => updatePedido(p.id, 'medico', v)} 
                              className={`h-8 ${isBeingEditedByMe ? 'border-orange-300 bg-white' : 'border-transparent hover:border-slate-300'}`} 
                              placeholder="Médico" 
                            />
                          ) : (p.medico ? <span>{p.medico}</span> : <span className="text-slate-400">-</span>)}
                        </TableCell>
                        <TableCell className="align-top">
                          {canEditAllFields ? (
                            <VendedorAutocomplete
                              value={p.vendedor || ''}
                              onSelect={(v) => updatePedido(p.id, 'vendedor', v)}
                              vendedores={vendedores}
                              className={`h-8 w-[180px] ${isBeingEditedByMe ? 'border-orange-300 bg-white' : 'border-transparent hover:border-slate-300'}`}
                            />
                          ) : (p.vendedor ? <span>{p.vendedor}</span> : <span className="text-slate-400">-</span>)}
                        </TableCell>
                        <TableCell className="align-top">
                          {canEditAllFields ? (
                            <EditableInput 
                              type="date"
                              value={p.data} 
                              onSave={(v) => updatePedido(p.id, 'data', v)} 
                              className={`h-8 ${isBeingEditedByMe ? 'border-orange-300 bg-white' : 'border-transparent hover:border-slate-300'}`} 
                            />
                          ) : formatDateBR(p.data)}
                        </TableCell>
                        <TableCell className="align-top">
                          {canEditAllFields ? (
                            <EditableTextarea 
                              value={p.produto} 
                              onSave={(v) => updatePedido(p.id, 'produto', v)} 
                              className={isBeingEditedByMe ? 'border-orange-300 bg-white' : ''} 
                              placeholder="Produto(s) - um por linha" 
                            />
                          ) : (
                            p.produto ? (
                              <div className="flex flex-col">
                                {p.produto.split('\n').filter(l => l.trim()).map((line, i) => (
                                  <div key={i} className="text-sm py-0.5 border-b border-slate-100 last:border-0">{line.trim()}</div>
                                ))}
                              </div>
                            ) : <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          {canEditAllFields ? (
                            <EditableInput 
                              type="number"
                              value={p.qtd} 
                              onSave={(v) => updatePedido(p.id, 'qtd', v)} 
                              className={`h-8 w-16 text-center ${isBeingEditedByMe ? 'border-orange-300 bg-white' : 'border-transparent hover:border-slate-300'}`} 
                            />
                          ) : p.qtd}
                        </TableCell>
                        <TableCell className="align-top">
                          {canEditAllFields ? (
                            <CurrencyInput 
                              value={p.total} 
                              onSave={(v) => updatePedido(p.id, 'total', v)} 
                              className={`h-8 w-28 text-right ${isBeingEditedByMe ? 'border-orange-300 bg-white' : 'border-transparent hover:border-slate-300'}`} 
                            />
                          ) : <span className="text-right block">R$ {formatCurrency(p.total)}</span>}
                        </TableCell>
                        <TableCell className="align-top">
                          {isBeingEditedByMe ? (
                            <EditableInput 
                              value={p.rastreio} 
                              onSave={(v) => updatePedido(p.id, 'rastreio', v)} 
                              className="h-8 border-orange-300 bg-white font-mono text-xs" 
                              placeholder="Código" 
                            />
                          ) : p.rastreio ? (
                            <button 
                              onClick={() => copyToClipboard(p.rastreio)}
                              className="font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1 group/copy"
                              title="Clique para copiar"
                            >
                              {p.rastreio}
                              <Copy className="w-3 h-3 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                            </button>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          <Select value={p.status} onValueChange={(v) => updatePedido(p.id, 'status', v)}>
                            <SelectTrigger className={`h-8 w-[130px] ${statusConfig[p.status].color}`}><SelectValue /></SelectTrigger>
                            <SelectContent>{Object.keys(statusConfig).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="align-top">
                          {isBeingEditedByMe ? (
                            <div className="flex gap-1">
                              <Button size="sm" onClick={finishEditingPedido} className="bg-green-500 hover:bg-green-600 h-8 px-2" title="Salvar">
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingPedidoId(null)} className="text-slate-500 hover:text-slate-700 h-8 px-2" title="Cancelar">
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              {/* Botão Editar - disponível para todos quando pedido está completo */}
                              {p.cliente && p.produto && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => startEditingPedido(p.id)} 
                                  className="text-blue-500 hover:bg-blue-50 h-8 px-2"
                                  title="Editar pedido"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              )}
                              {/* Botão Excluir - só admin */}
                              {isAdmin && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => deletePedido(p.id)} 
                                  className="text-red-500 hover:bg-red-50 h-8 px-2"
                                  title="Excluir pedido"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            {filteredPedidos.length === 0 && !editingPedidoId && <div className="py-16 text-center"><Package className="w-12 h-12 text-slate-300 mx-auto mb-4" /><p className="text-slate-500">Nenhum pedido</p></div>}
          </CardContent>
        </Card>
        <div className="mt-4 flex justify-between text-sm text-slate-500">
          <p>{filteredPedidos.length} de {pedidos.length} pedidos</p>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={loadPedidos} className="h-7 px-2 text-slate-500 hover:text-slate-700">
              <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
            </Button>
            <p className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${syncing ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`}></span>
              <span>{syncing ? 'Sincronizando...' : 'Conectado'}</span>
            </p>
          </div>
        </div>

        {/* Modal de Importação */}
        <Dialog open={showImportModal} onOpenChange={(open) => {
          setShowImportModal(open)
          if (!open) {
            setImportData([])
            setImportErrors([])
          }
        }}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Importar Pedidos
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 flex-1 overflow-y-auto">
              {/* Instruções */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                <p className="font-medium text-blue-800 mb-2">Formato do arquivo CSV:</p>
                <ul className="text-blue-700 space-y-1 list-disc list-inside">
                  <li>Separador: <strong>;</strong> (ponto e vírgula) ou <strong>,</strong> (vírgula)</li>
                  <li>Colunas: nr_pedido, cliente, medico, vendedor, data, produto, qtd, total, rastreio, status</li>
                  <li>Data: DD/MM/YYYY ou YYYY-MM-DD</li>
                  <li>Total: use vírgula para decimais (ex: 5000,50)</li>
                  <li>Múltiplos produtos: separe com \n (ex: Produto1\nProduto2)</li>
                </ul>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={downloadTemplate}
                  className="mt-3 text-blue-700 border-blue-300 hover:bg-blue-100"
                >
                  <Download className="w-4 h-4 mr-1" /> Baixar modelo CSV
                </Button>
              </div>

              {/* Upload */}
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-600 font-medium">Clique para selecionar arquivo CSV</p>
                  <p className="text-slate-400 text-sm">ou arraste e solte aqui</p>
                </label>
              </div>

              {/* Erros */}
              {importErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="font-medium text-red-800 mb-2">⚠️ Erros encontrados:</p>
                  <ul className="text-red-700 text-sm space-y-1 max-h-32 overflow-y-auto">
                    {importErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview */}
              {importData.length > 0 && (
                <div>
                  <p className="font-medium text-slate-700 mb-2">
                    ✅ {importData.length} pedido(s) prontos para importar:
                  </p>
                  <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Nº</th>
                          <th className="px-3 py-2 text-left">Cliente</th>
                          <th className="px-3 py-2 text-left">Produto</th>
                          <th className="px-3 py-2 text-left">Total</th>
                          <th className="px-3 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importData.slice(0, 20).map((row, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-2 font-mono">{row.nr_pedido}</td>
                            <td className="px-3 py-2">{row.cliente}</td>
                            <td className="px-3 py-2"><span>{row.produto.split('\n')[0]}{row.produto.includes('\n') ? '...' : ''}</span></td>
                            <td className="px-3 py-2">R$ {formatCurrency(row.total)}</td>
                            <td className="px-3 py-2">{row.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importData.length > 20 && (
                      <p className="text-center text-slate-500 text-sm py-2">
                        ... e mais {importData.length - 20} pedidos
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="border-t pt-4">
              <Button variant="outline" onClick={() => setShowImportModal(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={executeImport} 
                disabled={importData.length === 0 || importing}
                className="bg-green-500 hover:bg-green-600"
              >
                {importing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importando...</>
                ) : (
                  <><Upload className="w-4 h-4 mr-2" /> Importar {importData.length} pedido(s)</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  function renderJudicializacoes() {
    const handleAddJudic = async () => {
      if (!newJudic.cliente || !newJudic.produto) {
        toast.error('Preencha cliente e produto')
        return
      }
      await addJudicializacao(newJudic)
      setNewJudic({
        nr_processo: '', cliente: '', advogado: '', produto: '',
        qtd: 1, total: 0, data: getTodayInSaoPaulo(),
        status: 'Orçado', observacoes: ''
      })
      setShowAddJudic(false)
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Scale className="w-6 h-6 text-purple-600" />
              Judicializações
            </h2>
            <p className="text-sm text-slate-500">Orçamentos e acompanhamento de processos judiciais</p>
          </div>
          <Dialog open={showAddJudic} onOpenChange={setShowAddJudic}>
            <DialogTrigger asChild>
              <Button className="bg-purple-500 hover:bg-purple-600">
                <Plus className="w-4 h-4 mr-2" />Nova Judicialização
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Nova Judicialização</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <Input placeholder="Nº do Processo" value={newJudic.nr_processo} onChange={(e) => setNewJudic({...newJudic, nr_processo: e.target.value})} />
                <Input placeholder="Cliente *" value={newJudic.cliente} onChange={(e) => setNewJudic({...newJudic, cliente: e.target.value})} />
                <Input placeholder="Advogado" value={newJudic.advogado} onChange={(e) => setNewJudic({...newJudic, advogado: e.target.value})} />
                <Input placeholder="Produto *" value={newJudic.produto} onChange={(e) => setNewJudic({...newJudic, produto: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <Input type="number" placeholder="Quantidade" value={newJudic.qtd} onChange={(e) => setNewJudic({...newJudic, qtd: parseInt(e.target.value) || 1})} />
                  <Input placeholder="Total (R$)" value={newJudic.total || ''} onChange={(e) => setNewJudic({...newJudic, total: parseCurrency(e.target.value)})} />
                </div>
                <Input type="date" value={newJudic.data} onChange={(e) => setNewJudic({...newJudic, data: e.target.value})} />
                <Select value={newJudic.status} onValueChange={(v) => setNewJudic({...newJudic, status: v as any})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Orçado">Orçado</SelectItem>
                    <SelectItem value="Embarcado">Embarcado</SelectItem>
                    <SelectItem value="Entregue">Entregue</SelectItem>
                  </SelectContent>
                </Select>
                <textarea 
                  placeholder="Observações" 
                  value={newJudic.observacoes} 
                  onChange={(e) => setNewJudic({...newJudic, observacoes: e.target.value})}
                  className="w-full p-3 border rounded-md text-sm"
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddJudic(false)}>Cancelar</Button>
                <Button onClick={handleAddJudic} className="bg-purple-500 hover:bg-purple-600">Criar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4">
              <p className="text-amber-700 text-sm font-medium">Orçados</p>
              <p className="text-2xl font-bold">{judicializacoes.filter(j => j.status === 'Orçado').length}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <p className="text-blue-700 text-sm font-medium">Embarcados</p>
              <p className="text-2xl font-bold">{judicializacoes.filter(j => j.status === 'Embarcado').length}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <p className="text-green-700 text-sm font-medium">Entregues</p>
              <p className="text-2xl font-bold">{judicializacoes.filter(j => j.status === 'Entregue').length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Processo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Advogado</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>QTD</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {judicializacoes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                      <Scale className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      Nenhuma judicialização registrada
                    </TableCell>
                  </TableRow>
                ) : (
                  judicializacoes.map(j => (
                    <TableRow key={j.id} className="group">
                      <TableCell className="font-mono">{j.nr_processo || '-'}</TableCell>
                      <TableCell className="font-medium">{j.cliente}</TableCell>
                      <TableCell>{j.advogado || '-'}</TableCell>
                      <TableCell>{j.produto}</TableCell>
                      <TableCell>{j.qtd}</TableCell>
                      <TableCell>R$ {formatCurrency(j.total)}</TableCell>
                      <TableCell>{formatDateBR(j.data)}</TableCell>
                      <TableCell>
                        <Select value={j.status} onValueChange={(v) => updateJudicializacao(j.id, 'status', v)}>
                          <SelectTrigger className={`h-8 w-[120px] ${statusJudicConfig[j.status].bgColor} ${statusJudicConfig[j.status].color} border-0`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Orçado">Orçado</SelectItem>
                            <SelectItem value="Embarcado">Embarcado</SelectItem>
                            <SelectItem value="Entregue">Entregue</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => openEditJudic(j)} className="opacity-0 group-hover:opacity-100 text-blue-500 hover:bg-blue-50">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteJudicializacao(j.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Modal de Edição de Judicialização */}
        <Dialog open={showEditJudic} onOpenChange={setShowEditJudic}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Editar Judicialização</DialogTitle></DialogHeader>
            {editingJudic && (
              <div className="space-y-4 pt-4">
                <Input placeholder="Nº Processo" value={editingJudic.nr_processo} onChange={(e) => setEditingJudic({...editingJudic, nr_processo: e.target.value})} />
                <Input placeholder="Cliente *" value={editingJudic.cliente} onChange={(e) => setEditingJudic({...editingJudic, cliente: e.target.value})} />
                <Input placeholder="Advogado" value={editingJudic.advogado} onChange={(e) => setEditingJudic({...editingJudic, advogado: e.target.value})} />
                <Input placeholder="Produto *" value={editingJudic.produto} onChange={(e) => setEditingJudic({...editingJudic, produto: e.target.value})} />
                <div className="grid grid-cols-3 gap-4">
                  <Input type="number" placeholder="QTD" value={editingJudic.qtd} onChange={(e) => setEditingJudic({...editingJudic, qtd: parseInt(e.target.value) || 1})} />
                  <Input placeholder="Total" value={formatCurrency(editingJudic.total)} onChange={(e) => setEditingJudic({...editingJudic, total: parseCurrency(e.target.value)})} />
                  <Input type="date" value={editingJudic.data} onChange={(e) => setEditingJudic({...editingJudic, data: e.target.value})} />
                </div>
                <Select value={editingJudic.status} onValueChange={(v) => setEditingJudic({...editingJudic, status: v as any})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Orçado">Orçado</SelectItem>
                    <SelectItem value="Embarcado">Embarcado</SelectItem>
                    <SelectItem value="Entregue">Entregue</SelectItem>
                  </SelectContent>
                </Select>
                <textarea
                  placeholder="Observações"
                  value={editingJudic.observacoes || ''}
                  onChange={(e) => setEditingJudic({...editingJudic, observacoes: e.target.value})}
                  className="w-full min-h-[80px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditJudic(false)}>Cancelar</Button>
              <Button onClick={saveEditJudic} className="bg-purple-500 hover:bg-purple-600">Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  function renderControleEnvios() {
    const handleAddEnvio = async () => {
      if (!newEnvio.nome || !newEnvio.produto) {
        toast.error('Preencha nome e produto')
        return
      }
      await addControleEnvio(newEnvio)
      setNewEnvio({
        nome: '', produto: '', qtd: 1,
        data: getTodayInSaoPaulo(),
        rastreio: '', status: 'Pendente'
      })
      setShowAddEnvio(false)
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Send className="w-6 h-6 text-teal-600" />
              Controle de Envios
            </h2>
            <p className="text-sm text-slate-500">Envios sem fins lucrativos (não computados nas vendas)</p>
          </div>
          <Dialog open={showAddEnvio} onOpenChange={setShowAddEnvio}>
            <DialogTrigger asChild>
              <Button className="bg-teal-500 hover:bg-teal-600">
                <Plus className="w-4 h-4 mr-2" />Novo Envio
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Envio</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <Input placeholder="Nome *" value={newEnvio.nome} onChange={(e) => setNewEnvio({...newEnvio, nome: e.target.value})} />
                <Input placeholder="Produto *" value={newEnvio.produto} onChange={(e) => setNewEnvio({...newEnvio, produto: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <Input type="number" placeholder="Quantidade" value={newEnvio.qtd} onChange={(e) => setNewEnvio({...newEnvio, qtd: parseInt(e.target.value) || 1})} />
                  <Input type="date" value={newEnvio.data} onChange={(e) => setNewEnvio({...newEnvio, data: e.target.value})} />
                </div>
                <Input placeholder="Rastreio" value={newEnvio.rastreio} onChange={(e) => setNewEnvio({...newEnvio, rastreio: e.target.value})} />
                <Select value={newEnvio.status} onValueChange={(v) => setNewEnvio({...newEnvio, status: v as any})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Enviado">Enviado</SelectItem>
                    <SelectItem value="Em Trânsito">Em Trânsito</SelectItem>
                    <SelectItem value="Anvisa">Anvisa</SelectItem>
                    <SelectItem value="Problema">Problema</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddEnvio(false)}>Cancelar</Button>
                <Button onClick={handleAddEnvio} className="bg-teal-500 hover:bg-teal-600">Criar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4">
          {Object.entries(statusEnvioConfig).map(([status, config]) => (
            <Card key={status} className={`${config.bgColor} border-0`}>
              <CardContent className="p-4">
                <p className={`${config.color} text-sm font-medium`}>{status}</p>
                <p className="text-2xl font-bold">{controleEnvios.filter(e => e.status === status).length}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Nome</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>QTD</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Rastreio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {controleEnvios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      <Send className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      Nenhum envio registrado
                    </TableCell>
                  </TableRow>
                ) : (
                  controleEnvios.map(e => (
                    <TableRow key={e.id} className="group">
                      <TableCell className="font-medium">{e.nome}</TableCell>
                      <TableCell>{e.produto}</TableCell>
                      <TableCell>{e.qtd}</TableCell>
                      <TableCell>{formatDateBR(e.data)}</TableCell>
                      <TableCell>
                        {e.rastreio ? (
                          <button 
                            onClick={() => copyToClipboard(e.rastreio)}
                            className="font-mono text-xs text-blue-600 hover:underline"
                          >
                            {e.rastreio}
                          </button>
                        ) : <span>-</span>}
                      </TableCell>
                      <TableCell>
                        <Select value={e.status} onValueChange={(v) => updateControleEnvio(e.id, 'status', v)}>
                          <SelectTrigger className={`h-8 w-[120px] ${statusEnvioConfig[e.status].bgColor} ${statusEnvioConfig[e.status].color} border-0`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pendente">Pendente</SelectItem>
                            <SelectItem value="Enviado">Enviado</SelectItem>
                            <SelectItem value="Em Trânsito">Em Trânsito</SelectItem>
                            <SelectItem value="Anvisa">Anvisa</SelectItem>
                            <SelectItem value="Problema">Problema</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => openEditEnvio(e)} className="opacity-0 group-hover:opacity-100 text-blue-500 hover:bg-blue-50">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteControleEnvio(e.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Modal de Edição de Envio */}
        <Dialog open={showEditEnvio} onOpenChange={setShowEditEnvio}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar Envio</DialogTitle></DialogHeader>
            {editingEnvio && (
              <div className="space-y-4 pt-4">
                <Input placeholder="Nome *" value={editingEnvio.nome} onChange={(e) => setEditingEnvio({...editingEnvio, nome: e.target.value})} />
                <Input placeholder="Produto *" value={editingEnvio.produto} onChange={(e) => setEditingEnvio({...editingEnvio, produto: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <Input type="number" placeholder="Quantidade" value={editingEnvio.qtd} onChange={(e) => setEditingEnvio({...editingEnvio, qtd: parseInt(e.target.value) || 1})} />
                  <Input type="date" value={editingEnvio.data} onChange={(e) => setEditingEnvio({...editingEnvio, data: e.target.value})} />
                </div>
                <Input placeholder="Rastreio" value={editingEnvio.rastreio} onChange={(e) => setEditingEnvio({...editingEnvio, rastreio: e.target.value})} />
                <Select value={editingEnvio.status} onValueChange={(v) => setEditingEnvio({...editingEnvio, status: v as any})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Enviado">Enviado</SelectItem>
                    <SelectItem value="Em Trânsito">Em Trânsito</SelectItem>
                    <SelectItem value="Anvisa">Anvisa</SelectItem>
                    <SelectItem value="Problema">Problema</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditEnvio(false)}>Cancelar</Button>
              <Button onClick={saveEditEnvio} className="bg-teal-500 hover:bg-teal-600">Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  function renderThc2000() {
    const filteredThcPedidos = thcPedidos.filter(p => {
      const matchSearch = !thcSearchTerm || p.cliente.toLowerCase().includes(thcSearchTerm.toLowerCase()) || p.nr_pedido.toLowerCase().includes(thcSearchTerm.toLowerCase()) || p.produto.toLowerCase().includes(thcSearchTerm.toLowerCase()) || p.vendedor.toLowerCase().includes(thcSearchTerm.toLowerCase())
      const matchStatus = thcFilterStatus === 'Todos' || (p.thc_status || 'Pendente de Envio') === thcFilterStatus
      return matchSearch && matchStatus
    })

    const thcStats = {
      total: thcPedidos.length,
      pendente: thcPedidos.filter(p => !p.thc_status || p.thc_status === 'Pendente de Envio').length,
      enviado: thcPedidos.filter(p => p.thc_status === 'Enviado').length
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Receipt className="w-6 h-6 text-teal-600" />
              THC-2000
            </h2>
            <p className="text-sm text-slate-500">Pedidos com status THC / 2000</p>
          </div>
          <Button variant="outline" onClick={loadThcPedidos} className="gap-2">
            <RefreshCw className="w-4 h-4" />Atualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-slate-50 border-0">
            <CardContent className="p-4">
              <p className="text-slate-600 text-sm font-medium">Total</p>
              <p className="text-2xl font-bold">{thcStats.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 border-0">
            <CardContent className="p-4">
              <p className="text-amber-700 text-sm font-medium">Pendente de Envio</p>
              <p className="text-2xl font-bold">{thcStats.pendente}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-0">
            <CardContent className="p-4">
              <p className="text-green-700 text-sm font-medium">Enviado</p>
              <p className="text-2xl font-bold">{thcStats.enviado}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por pedido, cliente, produto ou vendedor..."
              value={thcSearchTerm}
              onChange={(e) => setThcSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {['Todos', 'Pendente de Envio', 'Enviado'].map(status => (
              <Button
                key={status}
                variant={thcFilterStatus === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setThcFilterStatus(status)}
                className={thcFilterStatus === status ? 'bg-teal-600 hover:bg-teal-700' : ''}
              >
                {status}
              </Button>
            ))}
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>N° Pedido</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>QTD</TableHead>
                  <TableHead>Enviar em</TableHead>
                  <TableHead>Rastreio</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredThcPedidos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                      <Receipt className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      Nenhum pedido THC / 2000 encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredThcPedidos.map(p => (
                    <TableRow key={p.id} className="group">
                      <TableCell className="font-mono text-sm font-medium">{p.nr_pedido}</TableCell>
                      <TableCell>{p.cliente}</TableCell>
                      <TableCell>{p.vendedor}</TableCell>
                      <TableCell>{formatDateBR(p.data)}</TableCell>
                      <TableCell>{p.produto}</TableCell>
                      <TableCell>{p.qtd}</TableCell>
                      <TableCell>{(() => {
                        const date = new Date(p.data + 'T12:00:00')
                        date.setDate(date.getDate() + 16)
                        return date.toLocaleDateString('pt-BR', { timeZone: SAO_PAULO_TZ })
                      })()}</TableCell>
                      <TableCell>
                        <Input
                          className="h-8 w-[160px] text-xs font-mono"
                          placeholder="Código de rastreio"
                          value={p.rastreio || ''}
                          onChange={(e) => {
                            setThcPedidos(thcPedidos.map(tp => tp.id === p.id ? { ...tp, rastreio: e.target.value } : tp))
                          }}
                          onBlur={(e) => {
                            updateThcPedido(p.id, 'rastreio', e.target.value)
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={p.thc_status || 'Pendente de Envio'}
                          onValueChange={(v) => updateThcPedido(p.id, 'thc_status', v)}
                        >
                          <SelectTrigger className={`h-8 w-[160px] ${statusThcConfig[p.thc_status || 'Pendente de Envio'].bgColor} ${statusThcConfig[p.thc_status || 'Pendente de Envio'].color} border-0`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pendente de Envio">Pendente de Envio</SelectItem>
                            <SelectItem value="Enviado">Enviado</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    )
  }

  function renderVendedores() {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Vendedores</h2>
            <p className="text-sm text-slate-500">Cadastre os vendedores para seleção nos pedidos</p>
          </div>
          <div className="flex gap-2">
            {/* Botão de Importar CSV */}
            <Dialog open={showImportVendedoresModal} onOpenChange={(open) => {
              setShowImportVendedoresModal(open)
              if (!open) {
                setImportVendedoresData([])
                setImportVendedoresErrors([])
              }
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50">
                  <Upload className="w-4 h-4 mr-2" />Importar CSV
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Importar Vendedores via CSV</DialogTitle>
                  <DialogDescription>
                    Faça upload de um arquivo CSV com os vendedores para cadastro em massa.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-4">
                  {/* Instruções */}
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg text-sm space-y-2">
                    <p className="font-medium">Formato do arquivo:</p>
                    <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-1">
                      <li>Separador: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">;</code> (ponto e vírgula) ou <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">,</code> (vírgula)</li>
                      <li>Coluna obrigatória: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">nome</code></li>
                      <li>Uma linha por vendedor</li>
                      <li>Vendedores duplicados serão ignorados</li>
                    </ul>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={downloadVendedoresTemplate}
                      className="text-orange-600 p-0 h-auto"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Baixar modelo de planilha
                    </Button>
                  </div>

                  {/* Upload de arquivo */}
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center">
                    <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      Arraste um arquivo CSV ou clique para selecionar
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleVendedoresFileUpload}
                      className="hidden"
                      id="vendedores-csv-input"
                    />
                    <label htmlFor="vendedores-csv-input">
                      <Button variant="outline" asChild className="cursor-pointer">
                        <span>Selecionar arquivo</span>
                      </Button>
                    </label>
                  </div>

                  {/* Erros de validação */}
                  {importVendedoresErrors.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <p className="font-medium text-red-700 dark:text-red-400 mb-2">
                        Avisos/Erros ({importVendedoresErrors.length}):
                      </p>
                      <ul className="text-sm text-red-600 dark:text-red-400 space-y-1 max-h-32 overflow-y-auto">
                        {importVendedoresErrors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Preview dos dados */}
                  {importVendedoresData.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 border-b">
                        <p className="font-medium text-sm">
                          Preview ({importVendedoresData.length} vendedor{importVendedoresData.length > 1 ? 'es' : ''} para importar)
                        </p>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">#</TableHead>
                              <TableHead>Nome</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {importVendedoresData.slice(0, 20).map((row, i) => (
                              <TableRow key={i}>
                                <TableCell className="text-slate-500">{i + 1}</TableCell>
                                <TableCell>{row.nome}</TableCell>
                              </TableRow>
                            ))}
                            {importVendedoresData.length > 20 && (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center text-slate-500 text-sm">
                                  ... e mais {importVendedoresData.length - 20} vendedor(es)
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowImportVendedoresModal(false)
                      setImportVendedoresData([])
                      setImportVendedoresErrors([])
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={executeVendedoresImport}
                    disabled={importVendedoresData.length === 0 || importingVendedores}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    {importingVendedores ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Importar {importVendedoresData.length} vendedor{importVendedoresData.length > 1 ? 'es' : ''}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Botão Novo Vendedor */}
            <Dialog open={showAddVendedor} onOpenChange={setShowAddVendedor}>
              <DialogTrigger asChild>
                <Button className="bg-orange-500 hover:bg-orange-600">
                  <UserPlus className="w-4 h-4 mr-2" />Novo Vendedor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo Vendedor</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input
                    placeholder="Nome do vendedor"
                    value={newVendedor}
                    onChange={(e) => setNewVendedor(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addVendedor()}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddVendedor(false)}>Cancelar</Button>
                  <Button onClick={addVendedor} className="bg-orange-500 hover:bg-orange-600">Cadastrar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendedores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                      Nenhum vendedor cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  vendedores.map(v => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="font-medium">{v.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 w-fit ${v.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {v.ativo ? <><CheckCircle2 className="w-3 h-3" /><span>Ativo</span></> : <><XCircle className="w-3 h-3" /><span>Inativo</span></>}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditVendedor(v)}
                            className="text-blue-500 hover:bg-blue-50"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleVendedor(v.id, v.ativo)}
                            className={v.ativo ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}
                          >
                            <span>{v.ativo ? 'Desativar' : 'Ativar'}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteVendedor(v.id)}
                            className="text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <p className="text-sm text-slate-500">
          {vendedores.filter(v => v.ativo).length} vendedor(es) ativo(s)
        </p>

        {/* Modal de Edição de Vendedor */}
        <Dialog open={showEditVendedor} onOpenChange={setShowEditVendedor}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar Vendedor</DialogTitle></DialogHeader>
            {editingVendedor && (
              <div className="space-y-4 pt-4">
                <Input
                  placeholder="Nome do vendedor"
                  value={editingVendedor.nome}
                  onChange={(e) => setEditingVendedor({...editingVendedor, nome: e.target.value})}
                  onKeyDown={(e) => e.key === 'Enter' && saveEditVendedor()}
                />
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditVendedor(false)}>Cancelar</Button>
              <Button onClick={saveEditVendedor} className="bg-orange-500 hover:bg-orange-600">Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  function renderUsuarios() {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div><h2 className="text-xl font-bold">Usuários</h2><p className="text-sm text-slate-500">Gerencie os usuários do sistema</p></div>
          <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
            <DialogTrigger asChild><Button className="bg-orange-500 hover:bg-orange-600"><UserPlus className="w-4 h-4 mr-2" />Novo</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Usuário</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <Input placeholder="Nome" value={newUser.nome} onChange={(e) => setNewUser({...newUser, nome: e.target.value})} />
                <Input placeholder="Email" type="email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} />
                <Input placeholder="Senha" value={newUser.senha} onChange={(e) => setNewUser({...newUser, senha: e.target.value})} />
                <Select value={newUser.tipo} onValueChange={(v) => setNewUser({...newUser, tipo: v as any})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="colaborador">Colaborador</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setShowAddUser(false)}>Cancelar</Button><Button onClick={addUser} className="bg-orange-500 hover:bg-orange-600">Criar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Usuário</TableHead><TableHead>Email</TableHead><TableHead>Tipo</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {usuarios.map(u => (
                  <TableRow key={u.id}>
                    <TableCell><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center ${u.tipo === 'admin' ? 'bg-orange-100' : 'bg-slate-100'}`}>{u.tipo === 'admin' ? <Shield className="w-4 h-4 text-orange-600" /> : <User className="w-4 h-4" />}</div><span className="font-medium">{u.nome}</span>{u.id === currentUser?.id && <span className="text-xs text-orange-600">(você)</span>}</div></TableCell>
                    <TableCell className="text-slate-500">{u.email}</TableCell>
                    <TableCell><span className={`px-2 py-1 rounded-full text-xs ${u.tipo === 'admin' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>{u.tipo === 'admin' ? 'Admin' : 'Colaborador'}</span></TableCell>
                    <TableCell><span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 w-fit ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.ativo ? <><CheckCircle2 className="w-3 h-3" /><span>Ativo</span></> : <><XCircle className="w-3 h-3" /><span>Inativo</span></>}</span></TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => openEditUser(u)} className="text-blue-500 hover:bg-blue-50">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {u.id !== currentUser?.id && <Button variant="ghost" size="sm" onClick={() => toggleUser(u.id, u.ativo)} className={u.ativo ? 'text-amber-600' : 'text-green-600'}>{u.ativo ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}</Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Modal de Edição de Usuário */}
        <Dialog open={showEditUser} onOpenChange={setShowEditUser}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar Usuário</DialogTitle></DialogHeader>
            {editingUser && (
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Nome</label>
                  <p className="text-sm text-slate-500 bg-slate-50 px-3 py-2 rounded-md">{editingUser.nome}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Email</label>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={editUserData.email}
                    onChange={(e) => setEditUserData({...editUserData, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Nova Senha</label>
                  <Input
                    type="password"
                    placeholder="Deixe em branco para manter a senha atual"
                    value={editUserData.senha}
                    onChange={(e) => setEditUserData({...editUserData, senha: e.target.value})}
                  />
                  <p className="text-xs text-slate-500 mt-1">Deixe em branco para não alterar a senha</p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditUser(false)}>Cancelar</Button>
              <Button onClick={saveEditUser} className="bg-orange-500 hover:bg-orange-600">Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ==================== GERADOR DE ORÇAMENTO ====================
  function renderGeradorOrcamento() {
    const statusConfig: Record<string, { color: string; bgColor: string }> = {
      'Rascunho': { color: 'text-slate-700', bgColor: 'bg-slate-100' },
      'Enviado': { color: 'text-blue-700', bgColor: 'bg-blue-100' },
      'Aprovado': { color: 'text-green-700', bgColor: 'bg-green-100' },
      'Recusado': { color: 'text-red-700', bgColor: 'bg-red-100' },
    }

    const filteredOrcamentos = orcamentos.filter(o =>
      !orcamentoSearchTerm ||
      o.numero.toLowerCase().includes(orcamentoSearchTerm.toLowerCase()) ||
      (o.cliente_nome || '').toLowerCase().includes(orcamentoSearchTerm.toLowerCase())
    )

    const filteredClientes = clientes.filter(c =>
      !clienteSearchTerm ||
      c.razao_social.toLowerCase().includes(clienteSearchTerm.toLowerCase()) ||
      (c.cnpj || '').includes(clienteSearchTerm)
    )

    // ---- CLIENT MANAGEMENT VIEW ----
    if (orcamentoView === 'clientes') {
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setOrcamentoView('list')}>
                <ArrowLeft className="w-4 h-4 mr-1" />Voltar
              </Button>
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Users className="w-6 h-6 text-indigo-600" />
                  Cadastro de Clientes
                </h2>
                <p className="text-sm text-slate-500">{clientes.length} cliente(s) cadastrado(s)</p>
              </div>
            </div>
            <Button onClick={() => setShowAddCliente(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />Novo Cliente
            </Button>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome ou CNPJ..."
              value={clienteSearchTerm}
              onChange={(e) => setClienteSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Client list */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Razão Social</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClientes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        <Building2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        Nenhum cliente cadastrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClientes.map(cliente => (
                      <TableRow key={cliente.id}>
                        <TableCell className="font-medium">{cliente.razao_social}</TableCell>
                        <TableCell>{cliente.cnpj || '-'}</TableCell>
                        <TableCell>{cliente.cidade ? `${cliente.cidade}${cliente.estado ? '/' + cliente.estado : ''}` : '-'}</TableCell>
                        <TableCell>{cliente.contato || '-'}</TableCell>
                        <TableCell>{cliente.email || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setEditingCliente(cliente); setShowEditCliente(true) }}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => { if (confirm('Excluir este cliente?')) deleteCliente(cliente.id) }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Add Client Dialog */}
          <Dialog open={showAddCliente} onOpenChange={setShowAddCliente}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Novo Cliente</DialogTitle>
                <DialogDescription>Cadastre as informações do cliente</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-1 block">Razão Social *</label>
                  <Input value={newCliente.razao_social} onChange={e => setNewCliente({ ...newCliente, razao_social: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">CNPJ</label>
                  <Input value={newCliente.cnpj} onChange={e => setNewCliente({ ...newCliente, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Contato</label>
                  <Input value={newCliente.contato} onChange={e => setNewCliente({ ...newCliente, contato: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-1 block">Endereço</label>
                  <Input value={newCliente.endereco} onChange={e => setNewCliente({ ...newCliente, endereco: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Cidade</label>
                  <Input value={newCliente.cidade} onChange={e => setNewCliente({ ...newCliente, cidade: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Estado</label>
                  <Input value={newCliente.estado} onChange={e => setNewCliente({ ...newCliente, estado: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">CEP</label>
                  <Input value={newCliente.cep} onChange={e => setNewCliente({ ...newCliente, cep: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Telefone</label>
                  <Input value={newCliente.telefone} onChange={e => setNewCliente({ ...newCliente, telefone: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-1 block">Email</label>
                  <Input value={newCliente.email} onChange={e => setNewCliente({ ...newCliente, email: e.target.value })} type="email" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddCliente(false)}>Cancelar</Button>
                <Button onClick={addCliente} className="bg-indigo-600 hover:bg-indigo-700">Cadastrar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Client Dialog */}
          <Dialog open={showEditCliente} onOpenChange={setShowEditCliente}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Editar Cliente</DialogTitle>
                <DialogDescription>Atualize as informações do cliente</DialogDescription>
              </DialogHeader>
              {editingCliente && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-sm font-medium mb-1 block">Razão Social *</label>
                    <Input value={editingCliente.razao_social} onChange={e => setEditingCliente({ ...editingCliente, razao_social: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">CNPJ</label>
                    <Input value={editingCliente.cnpj} onChange={e => setEditingCliente({ ...editingCliente, cnpj: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Contato</label>
                    <Input value={editingCliente.contato} onChange={e => setEditingCliente({ ...editingCliente, contato: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium mb-1 block">Endereço</label>
                    <Input value={editingCliente.endereco} onChange={e => setEditingCliente({ ...editingCliente, endereco: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Cidade</label>
                    <Input value={editingCliente.cidade} onChange={e => setEditingCliente({ ...editingCliente, cidade: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Estado</label>
                    <Input value={editingCliente.estado} onChange={e => setEditingCliente({ ...editingCliente, estado: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">CEP</label>
                    <Input value={editingCliente.cep} onChange={e => setEditingCliente({ ...editingCliente, cep: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Telefone</label>
                    <Input value={editingCliente.telefone} onChange={e => setEditingCliente({ ...editingCliente, telefone: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium mb-1 block">Email</label>
                    <Input value={editingCliente.email} onChange={e => setEditingCliente({ ...editingCliente, email: e.target.value })} type="email" />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditCliente(false)}>Cancelar</Button>
                <Button onClick={saveEditCliente} className="bg-indigo-600 hover:bg-indigo-700">Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )
    }

    // ---- NEW / EDIT BUDGET FORM ----
    if (orcamentoView === 'new' || orcamentoView === 'edit') {
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => { setOrcamentoView('list'); setEditingOrcamento(null) }}>
                <ArrowLeft className="w-4 h-4 mr-1" />Voltar
              </Button>
              <h2 className="text-xl font-bold">
                {orcamentoView === 'edit' ? 'Editar Orçamento' : 'Novo Orçamento'}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column - Company & Client */}
            <div className="lg:col-span-1 space-y-4">
              {/* Logo Upload */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Logo da Empresa</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center gap-3">
                    {logoBase64 ? (
                      <div className="relative">
                        <img src={logoBase64} alt="Logo" className="h-20 object-contain rounded border p-2" />
                        <Button variant="ghost" size="sm" className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full bg-red-100 hover:bg-red-200"
                          onClick={() => { setLogoBase64(null); localStorage.removeItem('orcamento-logo') }}>
                          <X className="w-3 h-3 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <div className="w-full h-20 border-2 border-dashed rounded flex items-center justify-center text-slate-400 text-sm">
                        Sem logo
                      </div>
                    )}
                    <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-1" />{logoBase64 ? 'Trocar' : 'Carregar'} Logo
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Company Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2"><Building2 className="w-4 h-4" />Empresa Emitente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Nome da Empresa</label>
                    <Input value={orcamentoForm.empresa_nome} onChange={e => setOrcamentoForm({ ...orcamentoForm, empresa_nome: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Endereço</label>
                    <Input value={orcamentoForm.empresa_endereco} onChange={e => setOrcamentoForm({ ...orcamentoForm, empresa_endereco: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Cidade / País</label>
                    <Input value={orcamentoForm.empresa_cidade} onChange={e => setOrcamentoForm({ ...orcamentoForm, empresa_cidade: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Telefone</label>
                    <Input value={orcamentoForm.empresa_telefone} onChange={e => setOrcamentoForm({ ...orcamentoForm, empresa_telefone: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Email</label>
                    <Input value={orcamentoForm.empresa_email} onChange={e => setOrcamentoForm({ ...orcamentoForm, empresa_email: e.target.value })} />
                  </div>
                </CardContent>
              </Card>

              {/* Client Selection */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2"><User className="w-4 h-4" />Cliente (Solicitante)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={orcamentoForm.cliente_id} onValueChange={v => setOrcamentoForm({ ...orcamentoForm, cliente_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.filter(c => c.ativo !== false).map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.razao_social}{c.cnpj ? ` (${c.cnpj})` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {orcamentoForm.cliente_id && (() => {
                    const sel = clientes.find(c => c.id === orcamentoForm.cliente_id)
                    if (!sel) return null
                    return (
                      <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded text-sm space-y-1">
                        <p className="font-medium">{sel.razao_social}</p>
                        {sel.cnpj && <p className="text-slate-500">CNPJ: {sel.cnpj}</p>}
                        {sel.endereco && <p className="text-slate-500">{sel.endereco}</p>}
                        {sel.cidade && <p className="text-slate-500">{sel.cidade}{sel.estado ? `, ${sel.estado}` : ''}</p>}
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
            </div>

            {/* Right column - Order details & Items */}
            <div className="lg:col-span-2 space-y-4">
              {/* Order Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Dados do Orçamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Número (Order)</label>
                      <Input value={orcamentoForm.numero} onChange={e => setOrcamentoForm({ ...orcamentoForm, numero: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Data</label>
                      <Input type="date" value={orcamentoForm.data} onChange={e => setOrcamentoForm({ ...orcamentoForm, data: e.target.value })} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Products Table */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-medium">Produtos / Serviços</CardTitle>
                    <Button variant="outline" size="sm" onClick={addOrcamentoItem}>
                      <Plus className="w-4 h-4 mr-1" />Adicionar Item
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="w-20 text-center">Qtd</TableHead>
                        <TableHead className="w-32 text-right">Preço Unit.</TableHead>
                        <TableHead className="w-32 text-right">Total</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orcamentoForm.itens.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Input
                              value={item.descricao}
                              onChange={e => updateOrcamentoItem(idx, 'descricao', e.target.value)}
                              placeholder="Descrição do produto"
                              className="border-0 shadow-none p-0 h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.qtd}
                              onChange={e => updateOrcamentoItem(idx, 'qtd', parseInt(e.target.value) || 0)}
                              className="border-0 shadow-none p-0 h-8 text-center"
                              min={1}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={formatCurrency(item.preco_unitario)}
                              onChange={e => {
                                const raw = e.target.value.replace(/[^\d.,]/g, '')
                                updateOrcamentoItem(idx, 'preco_unitario', parseCurrency(raw))
                              }}
                              className="border-0 shadow-none p-0 h-8 text-right"
                              placeholder="0,00"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.qtd * item.preco_unitario)}
                          </TableCell>
                          <TableCell>
                            {orcamentoForm.itens.length > 1 && (
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-600" onClick={() => removeOrcamentoItem(idx)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {/* Total */}
                  <div className="flex justify-end px-4 py-3 border-t bg-slate-50 dark:bg-slate-800">
                    <div className="text-right">
                      <span className="text-sm text-slate-500 mr-4">Total BRL:</span>
                      <span className="text-lg font-bold text-indigo-600">R$ {formatCurrency(calcularTotalOrcamento())}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Observations */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <textarea
                    value={orcamentoForm.observacoes}
                    onChange={e => setOrcamentoForm({ ...orcamentoForm, observacoes: e.target.value })}
                    className="w-full min-h-[100px] p-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm resize-y"
                    placeholder="Condições de pagamento, prazo de entrega, informações adicionais..."
                  />
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setOrcamentoView('list'); setEditingOrcamento(null) }}>
                  Cancelar
                </Button>
                <Button variant="outline" onClick={() => saveOrcamento('Rascunho')} className="border-slate-300">
                  <FileText className="w-4 h-4 mr-2" />Salvar Rascunho
                </Button>
                <Button onClick={() => saveOrcamento('Enviado')} className="bg-indigo-600 hover:bg-indigo-700">
                  <Check className="w-4 h-4 mr-2" />Salvar e Finalizar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // ---- BUDGET LIST VIEW (default) ----
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-600" />
              Gerador de Orçamento
            </h2>
            <p className="text-sm text-slate-500">{orcamentos.length} orçamento(s) gerado(s)</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOrcamentoView('clientes')}>
              <Users className="w-4 h-4 mr-2" />Clientes
            </Button>
            <Button onClick={() => { resetOrcamentoForm(); setEditingOrcamento(null); setOrcamentoView('new') }} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />Novo Orçamento
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{orcamentos.length}</p>
              <p className="text-xs text-slate-500">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-600">{orcamentos.filter(o => o.status === 'Rascunho').length}</p>
              <p className="text-xs text-slate-500">Rascunhos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{orcamentos.filter(o => o.status === 'Enviado').length}</p>
              <p className="text-xs text-slate-500">Enviados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{orcamentos.filter(o => o.status === 'Aprovado').length}</p>
              <p className="text-xs text-slate-500">Aprovados</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por número ou cliente..."
            value={orcamentoSearchTerm}
            onChange={(e) => setOrcamentoSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Budget list */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrcamentos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      Nenhum orçamento encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrcamentos.map(orc => (
                    <TableRow key={orc.id}>
                      <TableCell className="font-mono font-medium">{orc.numero}</TableCell>
                      <TableCell>{formatDateBR(orc.data)}</TableCell>
                      <TableCell>{orc.cliente_nome || '-'}</TableCell>
                      <TableCell className="text-right font-medium">R$ {formatCurrency(orc.valor_total)}</TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[orc.status]?.bgColor || ''} ${statusConfig[orc.status]?.color || ''}`}>
                          {orc.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" title="Gerar PDF" onClick={() => generatePDF(orc)}>
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Editar" onClick={() => editOrcamento(orc)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" title="Excluir"
                            onClick={() => { if (confirm('Excluir este orçamento?')) deleteOrcamento(orc.id) }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    )
  }
}

function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  )
}

export default AppWrapper
