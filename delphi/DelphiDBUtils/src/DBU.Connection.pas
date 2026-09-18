unit DBU.Connection;

interface

uses
  System.SysUtils, FireDAC.Comp.Client, DBU.Types;

type
  TDBUConnection = class
  private
    FConnection: TFDConnection;
    FEngine: TDBUEngine;
  public
    constructor Create(AConnection: TFDConnection; AEngine: TDBUEngine);
    procedure Connect;
    procedure Disconnect;
    function Connected: Boolean;
    property Connection: TFDConnection read FConnection;
    property Engine: TDBUEngine read FEngine;
  end;

implementation

constructor TDBUConnection.Create(AConnection: TFDConnection; AEngine: TDBUEngine);
begin
  inherited Create;
  if not Assigned(AConnection) then
    raise EDBUConnectionException.Create('TFDConnection não pode ser nil.');
  FConnection := AConnection;
  FEngine := AEngine;
  FConnection.LoginPrompt := False;
  FConnection.ResourceOptions.SilentMode := True;
end;

procedure TDBUConnection.Connect;
begin
  try
    if not FConnection.Connected then
      FConnection.Connected := True;
  except
    on E: Exception do
      raise EDBUConnectionException.CreateFmt('Falha ao conectar ao %s: %s', [DBUEngineToString(FEngine), E.Message]);
  end;
end;

procedure TDBUConnection.Disconnect;
begin
  if FConnection.Connected then
    FConnection.Connected := False;
end;

function TDBUConnection.Connected: Boolean;
begin
  Result := FConnection.Connected;
end;

end.
