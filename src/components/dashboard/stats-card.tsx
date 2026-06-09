import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: number
  description?: string
  colorClass?: string
}

export function StatsCard({ title, value, icon: Icon, trend, description, colorClass }: StatsCardProps) {
  const isPositive = trend !== undefined && trend >= 0

  return (
    <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn('p-2 rounded-lg', colorClass || 'bg-primary/10')}>
          <Icon className={cn('h-5 w-5', colorClass ? 'text-white' : 'text-primary')} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {(trend !== undefined || description) && (
          <div className="flex items-center gap-1 mt-1">
            {trend !== undefined && (
              <>
                {isPositive
                  ? <TrendingUp className="h-3 w-3 text-emerald-500" />
                  : <TrendingDown className="h-3 w-3 text-red-500" />}
                <span className={cn('text-xs font-medium', isPositive ? 'text-emerald-500' : 'text-red-500')}>
                  {isPositive ? '+' : ''}{trend}%
                </span>
              </>
            )}
            {description && (
              <span className="text-xs text-muted-foreground">{description}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
