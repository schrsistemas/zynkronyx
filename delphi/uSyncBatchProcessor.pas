unit uSyncBatchProcessor;

interface

uses
  System.SysUtils, System.Classes, FireDAC.Comp.Client, System.JSON;

type
  TSyncBatchProcessor = class
  private
    FConn: TFDConnection;
    FBatchSize: Integer;
    procedure ProcessBatch;
  public
    constructor Create(AConn: TFDConnection; ABatchSize: Integer = 100);
    procedure Execute;
  end;

implementation

constructor TSyncBatchProcessor.Create(AConn: TFDConnection; ABatchSize: Integer);
begin
  FConn := AConn;
  FBatchSize := ABatchSize;
end;

procedure TSyncBatchProcessor.Execute;
begin
  while True do
  begin
    ProcessBatch;
    Sleep(100);
  end;
end;

procedure TSyncBatchProcessor.ProcessBatch;
var
  QSel: TFDQuery;
  Count: Integer;
begin
  QSel := TFDQuery.Create(nil);
  try
    QSel.Connection := FConn;

    QSel.SQL.Text :=
      'SELECT FIRST :LIMIT ID FROM SYNC_STAGING WHERE STATUS = ''N'' ORDER BY ID';

    QSel.ParamByName('LIMIT').AsInteger := FBatchSize;

    QSel.Open;

    Count := QSel.RecordCount;

    if Count = 0 then
      Exit;

    FConn.StartTransaction;
    try
      while not QSel.Eof do
      begin
        // Aqui chamaria ApplyItem (reuso do processor principal)
        QSel.Next;
      end;

      FConn.Commit;
    except
      FConn.Rollback;
      raise;
    end;

  finally
    QSel.Free;
  end;
end;

end.
