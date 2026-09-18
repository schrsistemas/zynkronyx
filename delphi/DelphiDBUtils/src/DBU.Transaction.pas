unit DBU.Transaction;

interface

uses
  DBU.Connection, DBU.Types;

type
  TDBUTransaction = class
  private
    FConnection: TDBUConnection;
  public
    constructor Create(AConnection: TDBUConnection);
    procedure Start;
    procedure Commit;
    procedure Rollback;
    function Active: Boolean;
  end;

implementation

constructor TDBUTransaction.Create(AConnection: TDBUConnection);
begin
  inherited Create;
  if not Assigned(AConnection) then
    raise EDBUTransactionException.Create('Conexão não pode ser nil.');
  FConnection := AConnection;
end;

procedure TDBUTransaction.Start;
begin
  if not FConnection.Connected then
    FConnection.Connect;
  if not FConnection.Connection.InTransaction then
    FConnection.Connection.StartTransaction;
end;

procedure TDBUTransaction.Commit;
begin
  if FConnection.Connection.InTransaction then
    FConnection.Connection.Commit;
end;

procedure TDBUTransaction.Rollback;
begin
  if FConnection.Connection.InTransaction then
    FConnection.Connection.Rollback;
end;

function TDBUTransaction.Active: Boolean;
begin
  Result := FConnection.Connection.InTransaction;
end;

end.
