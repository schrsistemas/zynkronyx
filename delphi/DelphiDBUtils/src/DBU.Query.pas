unit DBU.Query;

interface

uses
  System.SysUtils, System.Variants, Data.DB, FireDAC.Comp.Client, DBU.Connection, DBU.Types;

type
  TDBUQuery = class
  private
    FConnection: TDBUConnection;
    FQuery: TFDQuery;
    procedure CheckParameter(const AName: string);
  public
    constructor Create(AConnection: TDBUConnection);
    destructor Destroy; override;

    function Open(const ASQL: string): TDataSet;
    function ExecSQL(const ASQL: string): Integer;

    procedure ParamByName(const AName: string; const AValue: Variant);
    procedure ParamNull(const AName: string);
    procedure ParamString(const AName, AValue: string);
    procedure ParamInteger(const AName: string; AValue: Integer);
    procedure ParamInt64(const AName: string; AValue: Int64);
    procedure ParamFloat(const AName: string; AValue: Double);
    procedure ParamCurrency(const AName: string; AValue: Currency);
    procedure ParamDateTime(const AName: string; const AValue: TDateTime);
    procedure ParamBoolean(const AName: string; AValue: Boolean);
    procedure ParamBytes(const AName: string; const AValue: TBytes);

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

procedure TDBUQuery.CheckParameter(const AName: string);
begin
  if Trim(AName) = '' then
    raise EDBUQueryException.Create('Nome do parâmetro não pode ser vazio.');

  if FQuery.Params.FindParam(AName) = nil then
    raise EDBUQueryException.CreateFmt('Parâmetro "%s" não existe na consulta.', [AName]);
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
  CheckParameter(AName);
  FQuery.ParamByName(AName).Value := AValue;
end;

procedure TDBUQuery.ParamNull(const AName: string);
begin
  CheckParameter(AName);
  FQuery.ParamByName(AName).Clear;
end;

procedure TDBUQuery.ParamString(const AName, AValue: string);
begin
  CheckParameter(AName);
  FQuery.ParamByName(AName).AsString := AValue;
end;

procedure TDBUQuery.ParamInteger(const AName: string; AValue: Integer);
begin
  CheckParameter(AName);
  FQuery.ParamByName(AName).AsInteger := AValue;
end;

procedure TDBUQuery.ParamInt64(const AName: string; AValue: Int64);
begin
  CheckParameter(AName);
  FQuery.ParamByName(AName).AsLargeInt := AValue;
end;

procedure TDBUQuery.ParamFloat(const AName: string; AValue: Double);
begin
  CheckParameter(AName);
  FQuery.ParamByName(AName).AsFloat := AValue;
end;

procedure TDBUQuery.ParamCurrency(const AName: string; AValue: Currency);
begin
  CheckParameter(AName);
  FQuery.ParamByName(AName).AsCurrency := AValue;
end;

procedure TDBUQuery.ParamDateTime(const AName: string; const AValue: TDateTime);
begin
  CheckParameter(AName);
  FQuery.ParamByName(AName).AsDateTime := AValue;
end;

procedure TDBUQuery.ParamBoolean(const AName: string; AValue: Boolean);
begin
  CheckParameter(AName);
  FQuery.ParamByName(AName).AsBoolean := AValue;
end;

procedure TDBUQuery.ParamBytes(const AName: string; const AValue: TBytes);
begin
  CheckParameter(AName);
  FQuery.ParamByName(AName).AsBytes := AValue;
end;

end.
