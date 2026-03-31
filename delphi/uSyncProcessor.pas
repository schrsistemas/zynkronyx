unit uSyncProcessor;

interface

uses
  System.SysUtils, System.Classes, FireDAC.Comp.Client, System.JSON;

type
  TSyncProcessor = class
  private
    FConn: TFDConnection;
    procedure ApplyItem(const AItem: TJSONObject);
  public
    constructor Create(AConn: TFDConnection);
    procedure ProcessarStaging;
  end;

implementation

constructor TSyncProcessor.Create(AConn: TFDConnection);
begin
  FConn := AConn;
end;

procedure TSyncProcessor.ProcessarStaging;
var
  QSel, QUpd: TFDQuery;
  JSON: TJSONObject;
begin
  QSel := TFDQuery.Create(nil);
  QUpd := TFDQuery.Create(nil);
  try
    QSel.Connection := FConn;
    QUpd.Connection := FConn;

    QSel.SQL.Text := 'SELECT ID, PAYLOAD FROM SYNC_STAGING WHERE PROCESSADO = ''N'' ORDER BY ID';
    QSel.Open;

    while not QSel.Eof do
    begin
      try
        JSON := TJSONObject.ParseJSONValue(QSel.FieldByName('PAYLOAD').AsString) as TJSONObject;
        try
          ApplyItem(JSON);

          QUpd.SQL.Text := 'UPDATE SYNC_STAGING SET PROCESSADO = ''S'' WHERE ID = :ID';
          QUpd.ParamByName('ID').AsLargeInt := QSel.FieldByName('ID').AsLargeInt;
          QUpd.ExecSQL;
        finally
          JSON.Free;
        end;
      except
        on E: Exception do
        begin
          // log e continua
          QUpd.SQL.Text := 'UPDATE SYNC_STAGING SET PROCESSADO = ''E'' WHERE ID = :ID';
          QUpd.ParamByName('ID').AsLargeInt := QSel.FieldByName('ID').AsLargeInt;
          QUpd.ExecSQL;
        end;
      end;

      QSel.Next;
    end;

  finally
    QSel.Free;
    QUpd.Free;
  end;
end;

procedure TSyncProcessor.ApplyItem(const AItem: TJSONObject);
var
  Tabela, Operacao, Chave: string;
begin
  Tabela := AItem.GetValue<string>('tabela');
  Operacao := AItem.GetValue<string>('operacao');
  Chave := AItem.GetValue<string>('chave');

  // Exemplo simples - expandir por tabela
  if Tabela = 'PRODUTO' then
  begin
    if Operacao = 'I' then
    begin
      // INSERT PRODUTO
    end
    else if Operacao = 'U' then
    begin
      // UPDATE PRODUTO
    end
    else if Operacao = 'D' then
    begin
      // DELETE PRODUTO
    end;
  end;
end;

end.
