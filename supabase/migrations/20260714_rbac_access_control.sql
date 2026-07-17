-- =====================================================
-- MIGRATION: RBAC — Autorización y Control de Acceso
-- Description: Modelo RBAC de tres niveles (roles, permisos entidad.acción,
--              permisos de campo) multi-tenant con auditoría.
--              NIST SP 800-53 AC-2 / AC-3 / AC-6 (fail-closed).
-- Version: 1.0
-- Date: 2026-07-14
-- Plan: docs/rbac-plan.md (Fase 2)
-- =====================================================

-- =====================================================
-- 1. TABLAS
-- =====================================================

-- Roles: globales (business_account_id NULL, visibles para todos los
-- tenants en solo lectura) o por tenant (gestionables por su cuenta).
CREATE TABLE IF NOT EXISTS rbac_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_account_id uuid REFERENCES business_accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  -- Roles semilla del sistema: no editables ni eliminables desde la UI.
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rbac_roles_name_not_empty CHECK (length(trim(name)) > 0)
);

-- UNIQUE compuesto que previene colisiones por tenant. Postgres trata cada
-- NULL como distinto, por lo que los roles globales necesitan su propio
-- índice único parcial.
CREATE UNIQUE INDEX IF NOT EXISTS rbac_roles_tenant_name_key
  ON rbac_roles (business_account_id, name)
  WHERE business_account_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS rbac_roles_global_name_key
  ON rbac_roles (name)
  WHERE business_account_id IS NULL;

-- Catálogo de permisos granulares entidad.acción (gestionado por plataforma).
CREATE TABLE IF NOT EXISTS rbac_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,          -- 'collection.read', 'agents.*', '*'
  entity text NOT NULL,               -- 'collection'
  action text NOT NULL,               -- 'read' | '*'
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rbac_permissions_code_format CHECK (
    code = '*' OR code ~ '^[a-z_]+\.([a-z_]+|\*)$'
  )
);

CREATE TABLE IF NOT EXISTS rbac_role_permissions (
  role_id uuid NOT NULL REFERENCES rbac_roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES rbac_permissions(id) ON DELETE CASCADE,
  granted_by uuid,                    -- auth.users.id (AC-2)
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

-- Asignación de roles a usuarios, SIEMPRE dentro de un tenant.
CREATE TABLE IF NOT EXISTS rbac_user_roles (
  user_id uuid NOT NULL,              -- auth.users.id
  role_id uuid NOT NULL REFERENCES rbac_roles(id) ON DELETE CASCADE,
  business_account_id uuid NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE, -- NULL = toda la cuenta
  granted_by uuid,                    -- AC-2: quién otorgó
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,             -- AC-2(2): asignaciones temporales
  PRIMARY KEY (user_id, role_id, business_account_id)
);

CREATE INDEX IF NOT EXISTS rbac_user_roles_user_idx
  ON rbac_user_roles (user_id, business_account_id);
CREATE INDEX IF NOT EXISTS rbac_user_roles_account_idx
  ON rbac_user_roles (business_account_id);

-- Permisos a nivel de campo (enforcement en Fase 4).
-- Fail-closed: un campo listado sin el rol del lector en viewable_by/editable_by
-- se deniega; un campo NO listado hereda el permiso de entidad.
CREATE TABLE IF NOT EXISTS rbac_field_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_account_id uuid REFERENCES business_accounts(id) ON DELETE CASCADE, -- NULL = política global
  entity text NOT NULL,
  field text NOT NULL,
  viewable_by uuid[] NOT NULL DEFAULT '{}',   -- rbac_roles.id
  editable_by uuid[] NOT NULL DEFAULT '{}',
  read_only boolean NOT NULL DEFAULT false,
  lock_after_save boolean NOT NULL DEFAULT false,
  visibility_conditions jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS rbac_field_permissions_tenant_key
  ON rbac_field_permissions (business_account_id, entity, field)
  WHERE business_account_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS rbac_field_permissions_global_key
  ON rbac_field_permissions (entity, field)
  WHERE business_account_id IS NULL;

-- Auditoría de cambios RBAC (AC-2): quién otorgó/revocó qué y cuándo.
CREATE TABLE IF NOT EXISTS rbac_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  table_name text NOT NULL,
  operation text NOT NULL,            -- INSERT | UPDATE | DELETE
  actor uuid,                         -- granted_by si está disponible
  business_account_id uuid,
  row_data jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS rbac_audit_log_account_idx
  ON rbac_audit_log (business_account_id, occurred_at DESC);

-- =====================================================
-- 2. TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION rbac_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rbac_roles_touch ON rbac_roles;
CREATE TRIGGER rbac_roles_touch
  BEFORE UPDATE ON rbac_roles
  FOR EACH ROW EXECUTE FUNCTION rbac_touch_updated_at();

DROP TRIGGER IF EXISTS rbac_field_permissions_touch ON rbac_field_permissions;
CREATE TRIGGER rbac_field_permissions_touch
  BEFORE UPDATE ON rbac_field_permissions
  FOR EACH ROW EXECUTE FUNCTION rbac_touch_updated_at();

-- Auditoría: cada mutación en asignaciones y permisos de rol queda registrada.
CREATE OR REPLACE FUNCTION rbac_audit_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row jsonb;
  v_actor uuid;
  v_account uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_row := to_jsonb(OLD);
  ELSE
    v_row := to_jsonb(NEW);
  END IF;

  v_actor := NULLIF(v_row->>'granted_by', '')::uuid;
  v_account := NULLIF(v_row->>'business_account_id', '')::uuid;

  INSERT INTO rbac_audit_log (table_name, operation, actor, business_account_id, row_data)
  VALUES (TG_TABLE_NAME, TG_OP, v_actor, v_account, v_row);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rbac_user_roles_audit ON rbac_user_roles;
CREATE TRIGGER rbac_user_roles_audit
  AFTER INSERT OR UPDATE OR DELETE ON rbac_user_roles
  FOR EACH ROW EXECUTE FUNCTION rbac_audit_trigger();

DROP TRIGGER IF EXISTS rbac_role_permissions_audit ON rbac_role_permissions;
CREATE TRIGGER rbac_role_permissions_audit
  AFTER INSERT OR UPDATE OR DELETE ON rbac_role_permissions
  FOR EACH ROW EXECUTE FUNCTION rbac_audit_trigger();

DROP TRIGGER IF EXISTS rbac_roles_audit ON rbac_roles;
CREATE TRIGGER rbac_roles_audit
  AFTER INSERT OR UPDATE OR DELETE ON rbac_roles
  FOR EACH ROW EXECUTE FUNCTION rbac_audit_trigger();

-- =====================================================
-- 3. FUNCIONES (RPC)
-- =====================================================

-- Enforcement central AC-3, fail-closed: concede solo si existe el permiso
-- exacto, el comodín 'entidad.*' o el superpermiso '*', a través de algún
-- rol vigente del usuario en esa cuenta (y sucursal, si la asignación está
-- acotada a una).
CREATE OR REPLACE FUNCTION rbac_authorize(
  p_user_id uuid,
  p_permission text,
  p_business_account_id uuid,
  p_business_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM rbac_user_roles ur
    JOIN rbac_role_permissions rp ON rp.role_id = ur.role_id
    JOIN rbac_permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = p_user_id
      AND ur.business_account_id = p_business_account_id
      -- Fail-closed: una asignación acotada a sucursal solo aplica cuando la
      -- operación declara esa misma sucursal; sin sucursal declarada, solo
      -- valen las asignaciones de cuenta completa (business_id NULL).
      AND (ur.business_id IS NULL OR ur.business_id = p_business_id)
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
      AND (
        p.code = p_permission
        OR p.code = split_part(p_permission, '.', 1) || '.*'
        OR p.code = '*'
      )
  );
$$;

-- Lista de permisos efectivos de un usuario en una cuenta. Alimenta la UI y,
-- en Fase 3, el Custom Access Token Hook (scopes en el JWT).
CREATE OR REPLACE FUNCTION rbac_get_user_permissions(
  p_user_id uuid,
  p_business_account_id uuid
) RETURNS TABLE (code text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.code
  FROM rbac_user_roles ur
  JOIN rbac_role_permissions rp ON rp.role_id = ur.role_id
  JOIN rbac_permissions p ON p.id = rp.permission_id
  WHERE ur.user_id = p_user_id
    AND ur.business_account_id = p_business_account_id
    AND (ur.expires_at IS NULL OR ur.expires_at > now())
  ORDER BY 1;
$$;

-- Solo el rol de servicio puede invocarlas: reciben p_user_id arbitrario,
-- así que exponerlas a `authenticated` permitiría enumerar permisos ajenos.
-- Las server actions (service key) son el único caller; en Fase 3 se
-- otorgará EXECUTE a supabase_auth_admin para el Custom Access Token Hook.
REVOKE ALL ON FUNCTION rbac_authorize(uuid, text, uuid, uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION rbac_get_user_permissions(uuid, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION rbac_authorize(uuid, text, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION rbac_get_user_permissions(uuid, uuid) TO service_role;

-- =====================================================
-- 4. RLS (defensa en profundidad; el server usa service_role)
-- =====================================================

ALTER TABLE rbac_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac_field_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac_audit_log ENABLE ROW LEVEL SECURITY;

-- Sin políticas para anon/authenticated: deny-all salvo service_role.
-- Las lecturas de usuario final pasan por las server actions (guards) o por
-- las funciones SECURITY DEFINER de arriba. Políticas RLS por-claim llegan
-- en Fase 6 junto con la migración fuera de la service key.

-- =====================================================
-- 5. SEEDS — catálogo de permisos
-- =====================================================

INSERT INTO rbac_permissions (code, entity, action, description) VALUES
  ('*', '*', '*', 'Superpermiso: acceso total a la plataforma'),
  -- Cuentas y sucursales
  ('account.read',        'account',        'read',   'Ver la cuenta de negocio'),
  ('account.update',      'account',        'update', 'Editar datos de la cuenta'),
  ('account.delete',      'account',        'delete', 'Eliminar cuentas'),
  ('business.read',       'business',       'read',   'Ver sucursales'),
  ('business.create',     'business',       'create', 'Crear sucursales'),
  ('business.update',     'business',       'update', 'Editar sucursales'),
  ('business.delete',     'business',       'delete', 'Eliminar sucursales'),
  ('member.read',         'member',         'read',   'Ver miembros de la cuenta'),
  ('member.create',       'member',         'create', 'Invitar/crear miembros'),
  ('member.update',       'member',         'update', 'Editar miembros'),
  ('member.delete',       'member',         'delete', 'Eliminar miembros'),
  -- Clientes
  ('customer.read',       'customer',       'read',   'Ver clientes'),
  ('customer.create',     'customer',       'create', 'Crear clientes'),
  ('customer.update',     'customer',       'update', 'Editar clientes'),
  ('customer.delete',     'customer',       'delete', 'Eliminar clientes'),
  ('customer.import',     'customer',       'import', 'Importar/exportar clientes'),
  -- Cartera (collection)
  ('collection.read',     'collection',     'read',   'Ver módulo de cartera'),
  ('collection.create',   'collection',     'create', 'Crear ejecuciones/plantillas'),
  ('collection.update',   'collection',     'update', 'Editar recursos de cartera'),
  ('collection.delete',   'collection',     'delete', 'Eliminar recursos de cartera'),
  ('collection.execute',  'collection',     'execute','Lanzar ejecuciones de cobranza'),
  ('collection.settings', 'collection',     'settings','Configurar el módulo de cartera'),
  -- Reportes y tableros
  ('report.read',         'report',         'read',   'Ver reportes'),
  ('report.export',       'report',         'export', 'Exportar reportes'),
  ('dashboard.read',      'dashboard',      'read',   'Ver tableros'),
  -- Agencia IA
  ('agent.read',          'agent',          'read',   'Ver agentes IA'),
  ('agent.create',        'agent',          'create', 'Crear agentes IA'),
  ('agent.update',        'agent',          'update', 'Editar agentes IA'),
  ('agent.delete',        'agent',          'delete', 'Eliminar agentes IA'),
  ('agent.execute',       'agent',          'execute','Ejecutar agentes IA'),
  ('tool.read',           'tool',           'read',   'Ver herramientas'),
  ('tool.manage',         'tool',           'manage', 'Gestionar herramientas y conectores'),
  ('tool.execute',        'tool',           'execute','Ejecutar herramientas'),
  ('workflow.read',       'workflow',       'read',   'Ver flujos'),
  ('workflow.manage',     'workflow',       'manage', 'Gestionar flujos'),
  ('workflow.execute',    'workflow',       'execute','Ejecutar flujos'),
  ('integration.read',    'integration',    'read',   'Ver integraciones'),
  ('integration.manage',  'integration',    'manage', 'Gestionar integraciones'),
  -- WhatsApp
  ('whatsapp.read',       'whatsapp',       'read',   'Ver conversaciones/config de WhatsApp'),
  ('whatsapp.send',       'whatsapp',       'send',   'Enviar mensajes de WhatsApp'),
  ('whatsapp.settings',   'whatsapp',       'settings','Configurar WhatsApp'),
  -- Suscripción y facturación
  ('subscription.read',   'subscription',   'read',   'Ver suscripción y pagos'),
  ('subscription.manage', 'subscription',   'manage', 'Gestionar suscripción y tarjetas'),
  -- Plataforma (solo company_admin)
  ('plan.read',           'plan',           'read',   'Ver planes'),
  ('plan.manage',         'plan',           'manage', 'Gestionar planes y módulos'),
  ('system.settings',     'system',         'settings','Configuración del sistema'),
  ('audit.read',          'audit',          'read',   'Ver auditoría'),
  -- Control de acceso (este módulo)
  ('access_control.read',   'access_control', 'read',  'Ver roles y permisos'),
  ('access_control.manage', 'access_control', 'manage','Gestionar roles y asignaciones del tenant')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 6. SEEDS — roles globales del sistema (espejo de const/roles.ts)
-- =====================================================

INSERT INTO rbac_roles (business_account_id, name, description, is_system) VALUES
  (NULL, 'company_admin',    'Administrador de plataforma: acceso total', true),
  (NULL, 'business_admin',   'Administrador de cuenta: gestiona su tenant completo', true),
  (NULL, 'professional',     'Profesional: opera cartera, clientes y agentes IA', true),
  (NULL, 'business_monitor', 'Monitor: lectura de clientes y tableros', true),
  (NULL, 'customer',         'Cliente final: portal de autoservicio', true)
ON CONFLICT DO NOTHING;

-- company_admin → superpermiso
INSERT INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM rbac_roles r, rbac_permissions p
WHERE r.name = 'company_admin' AND r.business_account_id IS NULL AND r.is_system
  AND p.code = '*'
ON CONFLICT DO NOTHING;

-- business_admin → todo su tenant (sin plataforma)
INSERT INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM rbac_roles r, rbac_permissions p
WHERE r.name = 'business_admin' AND r.business_account_id IS NULL AND r.is_system
  AND p.code IN (
    'account.read','account.update',
    'business.read','business.create','business.update','business.delete',
    'member.read','member.create','member.update','member.delete',
    'customer.read','customer.create','customer.update','customer.delete','customer.import',
    'collection.read','collection.create','collection.update','collection.delete','collection.execute','collection.settings',
    'report.read','report.export','dashboard.read',
    'agent.read','agent.create','agent.update','agent.delete','agent.execute',
    'tool.read','tool.manage','tool.execute',
    'workflow.read','workflow.manage','workflow.execute',
    'integration.read','integration.manage',
    'whatsapp.read','whatsapp.send',
    'subscription.read','subscription.manage',
    'audit.read',
    'access_control.read','access_control.manage'
  )
ON CONFLICT DO NOTHING;

-- professional → operación diaria
INSERT INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM rbac_roles r, rbac_permissions p
WHERE r.name = 'professional' AND r.business_account_id IS NULL AND r.is_system
  AND p.code IN (
    'dashboard.read',
    'customer.read','customer.create','customer.update',
    'collection.read','collection.create','collection.update','collection.execute',
    'agent.read','agent.execute',
    'tool.read','tool.execute',
    'workflow.read','workflow.execute',
    'integration.read',
    'whatsapp.read','whatsapp.send'
  )
ON CONFLICT DO NOTHING;

-- business_monitor → lectura
INSERT INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM rbac_roles r, rbac_permissions p
WHERE r.name = 'business_monitor' AND r.business_account_id IS NULL AND r.is_system
  AND p.code IN ('dashboard.read','customer.read')
ON CONFLICT DO NOTHING;

-- customer → autoservicio
INSERT INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM rbac_roles r, rbac_permissions p
WHERE r.name = 'customer' AND r.business_account_id IS NULL AND r.is_system
  AND p.code IN ('dashboard.read')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 7. BACKFILL — asignaciones desde metadata legacy de auth.users
-- =====================================================
-- El rol actual vive en user_metadata.role (legacy). Se materializa en
-- rbac_user_roles para que rbac_authorize() funcione desde el día uno.
-- Idempotente: ON CONFLICT DO NOTHING.

INSERT INTO rbac_user_roles (user_id, role_id, business_account_id, granted_by)
SELECT
  u.id,
  r.id,
  (COALESCE(u.raw_app_meta_data->>'business_account_id',
            u.raw_user_meta_data->>'business_account_id'))::uuid,
  NULL
FROM auth.users u
JOIN rbac_roles r
  ON r.business_account_id IS NULL
 AND r.is_system
 AND r.name = COALESCE(u.raw_app_meta_data->>'role', u.raw_user_meta_data->>'role')
WHERE COALESCE(u.raw_app_meta_data->>'business_account_id',
               u.raw_user_meta_data->>'business_account_id') IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM business_accounts ba
    WHERE ba.id = (COALESCE(u.raw_app_meta_data->>'business_account_id',
                            u.raw_user_meta_data->>'business_account_id'))::uuid
  )
ON CONFLICT DO NOTHING;

-- NOTA: los company_admin no tienen business_account_id en metadata; su
-- acceso de plataforma sigue resuelto por el rol de sesión (tenant-guard)
-- hasta la Fase 3 (claims). rbac_authorize() aplica a permisos de tenant.
