USE master;
GO

CREATE DATABASE TestDB;
GO

USE TestDB;
GO

CREATE TABLE YourTable (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(50),
    value NVARCHAR(100),
    created_at DATETIME DEFAULT GETDATE()
);
GO

INSERT INTO YourTable (name, value) VALUES ('Dummy User 1', 'Sample Value 1');
INSERT INTO YourTable (name, value) VALUES ('Dummy User 2', 'Sample Value 2');
INSERT INTO YourTable (name, value) VALUES ('Dummy User 3', 'Sample Value 3');
INSERT INTO YourTable (name, value) VALUES ('Dummy User 4', 'Sample Value 4');
INSERT INTO YourTable (name, value) VALUES ('Dummy User 5', 'Sample Value 5');
INSERT INTO YourTable (name, value) VALUES ('Dummy User 6', 'Sample Value 6');
INSERT INTO YourTable (name, value) VALUES ('Dummy User 7', 'Sample Value 7');
INSERT INTO YourTable (name, value) VALUES ('Dummy User 8', 'Sample Value 8');
INSERT INTO YourTable (name, value) VALUES ('Dummy User 9', 'Sample Value 9');
INSERT INTO YourTable (name, value) VALUES ('Dummy User 10', 'Sample Value 10');
GO
