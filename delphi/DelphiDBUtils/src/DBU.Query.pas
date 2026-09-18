unit DBU.Query;

interface

uses
  System.SysUtils, System.Variants, Data.DB, FireDAC.Comp.Client, DBU.Connection, DBU.Types;

type
  TDBUQuery = class
  private
    FConnection: TDBUConnection;
    FQuery: TFDQuery;
  public
    constructor Create(AConnection: TDBUConnection);
    destructor Destroy; override;
    function Open(const ASQL: string): TDataSet;
    function ExecSQL(const ASQL: string): Integer;
    procedure ParamByName(const AName: string; const AValue: Variant);
    procedure ParamNull(const AName: string);
    property Query: TFDQuery read FQuery;
  end;

implementation

constructor TDBUQuery.Create(AConnection: TDBUConnection);
begin
  inherited Create;
  if not Assigned(AConnection) then
    raise EDBUQueryException.Create('Conexão não pode ser nil.');
  FConnection := AConnection;
  FQuery := TFDQuery.Create(nil);
  FQuery.Connection := FConnection.Connection;
end;

destructor TDBUQuery.Destroy;
begin
  FQuery.Free;
  inherited;
end;

function TDBUQuery.Open(const ASQL: string): TDataSet;
begin
  if Trim(ASQL) = '' then
    raise EDBUQueryException.Create('SQL não pode ser vazio.');
  try
    FQuery.Close;
    FQuery.SQL.Text := ASQL;
    FQuery.Open;
    Result := FQuery;
  except
    on E: Exception do
      raise EDBUQueryException.CreateFmt('Erro ao abrir consulta: %s', [E.Message]);
  end;
end;

function TDBUQuery.ExecSQL(const ASQL: string): Integer;
begin
  if Trim(ASQL) = '' then
    raise EDBUQueryException.Create('SQL não pode ser vazio.');
  try
    FQuery.Close;
    FQuery.SQL.Text := ASQL;
    FQuery.ExecSQL;
    Result := FQuery.RowsAffected;
  except
    on E: Exception do
      raise EDBUQueryException.CreateFmt('Erro ao executar SQL: %s', [E.Message]);
  end;
end;

procedure TDBUQuery.ParamByName(const AName: string; const AValue: Variant);
begin
  FQuery.ParamByName(AName).Value := AValue;
end;

procedure TDBUQuery.ParamNull(const AName: string);
begin
  FQuery.ParamByName(AName).Clear;
end;

end.
