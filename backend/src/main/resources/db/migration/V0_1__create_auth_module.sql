CREATE TABLE IF NOT EXISTS permissions (
    name VARCHAR(255) PRIMARY KEY,
    description VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS roles (
    name VARCHAR(255) PRIMARY KEY,
    description VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(255),
    password VARCHAR(255),
    display_name VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS invalidated_token (
    id VARCHAR(255) PRIMARY KEY,
    expiry_time TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles_permissions (
    role_name VARCHAR(255) NOT NULL,
    permissions_name VARCHAR(255) NOT NULL,
    CONSTRAINT fk_roles_permissions_role
        FOREIGN KEY (role_name) REFERENCES roles (name),
    CONSTRAINT fk_roles_permissions_permission
        FOREIGN KEY (permissions_name) REFERENCES permissions (name)
);

CREATE TABLE IF NOT EXISTS users_roles (
    user_id VARCHAR(36) NOT NULL,
    roles_name VARCHAR(255) NOT NULL,
    CONSTRAINT fk_users_roles_user
        FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_users_roles_role
        FOREIGN KEY (roles_name) REFERENCES roles (name)
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_invalidated_token_expiry_time ON invalidated_token (expiry_time);
CREATE INDEX IF NOT EXISTS idx_roles_permissions_role ON roles_permissions (role_name);
CREATE INDEX IF NOT EXISTS idx_roles_permissions_permission ON roles_permissions (permissions_name);
CREATE INDEX IF NOT EXISTS idx_users_roles_user ON users_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_users_roles_role ON users_roles (roles_name);
