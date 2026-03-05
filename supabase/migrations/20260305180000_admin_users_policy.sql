-- ==============================================================================
-- Lidera Space: Políticas para Gestão de Usuários via Painel Admin
-- ==============================================================================

-- 1. Garante que Admins possam ver a lista completa de usuários na tabela public.users
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;

CREATE POLICY "Admins can view all users" 
ON public.users 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 2. Garante que Admins possam atualizar a role (permissão) de outros usuários
DROP POLICY IF EXISTS "Admins can update user roles" ON public.users;

CREATE POLICY "Admins can update user roles" 
ON public.users 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
