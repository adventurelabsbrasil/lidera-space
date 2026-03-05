# Guia de Gestão de Usuários, Roles e Programas (Lidera Space)

O Lidera Space é uma plataforma EdTech desenvolvida pela Adventure Labs, mas operada com a infraestrutura (Supabase) própria do Lidera. Este guia documenta como o cliente Lidera pode gerenciar seus alunos, atribuir permissões (Roles) de administrador e como a arquitetura de acesso e métodos de login (E-mail/Senha e Google) está estruturada.

---

## 1. Arquitetura de Permissões (Roles)

O sistema possui duas camadas de segurança integradas ao Supabase: a camada de Autenticação (`auth.users`) e a camada de Dados (`public.users`). 

Atualmente, existem duas Roles (papéis) no sistema:
*   **`aluno` (Padrão):** Tem permissão apenas para consumir conteúdo (ler programas, módulos e aulas) e gerenciar o próprio progresso (marcar aula como concluída e adicionar notas privadas).
*   **`admin`:** Tem acesso total. Pode criar, editar e excluir Programas, Módulos e Aulas. O Middleware do Next.js e o RLS no banco impedem ativamente que alunos editem o conteúdo.

### Como funciona o cadastro de um novo usuário:
1. Um usuário se cadastra ou faz login via Google no site Lidera Space.
2. Uma nova linha é criada no esquema de segurança do seu Supabase (`auth.users`).
3. Uma "Trigger" automática no banco de dados dispara e copia esse usuário para a tabela `public.users`, atribuindo a ele a role de `'aluno'` imediatamente.

---

## 2. Como adicionar novos Alunos e Clientes

### Via Convite Direto (E-mail e Senha)
Se a Lidera precisar adicionar um cliente corporativo ou aluno antes que ele crie a própria conta:
1. O administrador entra no **Painel do Supabase (Conta Lidera)**.
2. Navega até a seção **Authentication > Users**.
3. Clica no botão **Add user > Invite user**.
4. Insere o e-mail do aluno. O aluno receberá um e-mail com um link para definir a própria senha e acessar a plataforma. Ele entrará automaticamente como `aluno`.

### Via Login Social (Google OAuth)
A plataforma suporta o botão "Entrar com o Google". Qualquer pessoa que usar essa opção será automaticamente registrada como `aluno`.
*   **Como habilitar o Google no Supabase Lidera:** 
    1. Acesse o **Google Cloud Console**, crie um projeto e gere credenciais OAuth (Client ID e Client Secret).
    2. Configure-as no painel do Supabase Lidera em **Authentication > Providers > Google**. 
    3. Copie a *Callback URL* que o Supabase fornecer e cole lá no Google Cloud como um URI autorizado.

---

## 3. Como promover um membro do Lidera a Administrador

Para que alguém da equipe Lidera consiga gerenciar o conteúdo da plataforma (criar cursos), é necessário elevar a Role dessa pessoa de `aluno` para `admin`.

**Como fazer:**
1. Peça para o membro da equipe criar uma conta na plataforma (fazendo login normal via Google ou E-mail).
2. Acesse o seu **Supabase > SQL Editor**.
3. Clique em **+ New Query** e rode o código substituindo o e-mail pelo do membro da equipe:
```sql
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'membro.equipe@lidera.com.br';
```
Pronto. Quando esse usuário recarregar a página do Lidera Space, o painel mudará de "Meus Programas" para "Gestão de Programas", liberando todos os botões de criação.

---

## 4. Controle Granular de Acesso a Programas (Atenção EdTech)

A infraestrutura inicial do Lidera Space opera no modelo "Plataforma de Membros" fechada, mas unificada.
Ou seja, hoje, a política RLS do banco de dados diz o seguinte:
*   `Anyone logged in can read programs` -> Qualquer usuário com login feito pode ver **todos** os programas disponíveis.

### Próximos Passos (A ser implementado no Lidera Space):
Como a Lidera vende treinamentos isolados para clientes diferentes, será necessário solicitar que a Adventure Labs libere a **Fase 2 da Arquitetura**, que envolve:

1. **Nova Tabela de Matrículas (Enrollments):**
   Criar a tabela `public.enrollments (user_id, program_id)`.
2. **Atualização do RLS (Segurança):**
   Mudar a política de "Leitura de Programas" no banco de dados para impedir que um aluno veja o curso de outro cliente.
3. **Novo Painel B2B:**
   Uma interface para os admins do Lidera poderem liberar acesso de programas por lotes (ex: "Liberar Programa X para 100 e-mails do Domínio Y").

*Até que essa alteração seja feita, recomendamos usar a plataforma atual apenas para Hospedagem de Treinamentos Globais que sirvam para toda a base de usuários matriculados.*